/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ibertran <ibertran@student.42lyon.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/12/05 03:04:17 by ibertran          #+#    #+#             */
/*   Updated: 2024/12/09 18:30:54 by ibertran         ###   ########lyon.fr   */
/*                                                                            */
/* ************************************************************************** */

const pThrottle = require('p-throttle').default;
const parse = require("parse-link-header");
const { User } = require('./srcs/User');
const { CoalitionUser } = require('./srcs/CoalitionUser');
const { timeToSeconds } = require('./utils/logtime');
const addPageSize = require('./srcs/url/pageSize');
const appendOptions = require('./srcs/url/appendOptions');

const throttle = pThrottle({ limit: 1, interval: 600 });

const API_TOKEN_URL = "https://api.intra.42.fr/oauth/token";

module.exports.Api42 = class Api42 {
  #uid;
  #secret;
  #redirectUri;

  #token = {};
  #debugmode = false;

  #site = "https://api.intra.42.fr";
  #oauthEndpoint = "https://api.intra.42.fr/oauth/authorize";
  #oauthScopes =  ["public"];
  
  #fetch = throttle(this.#fetchTemplate.bind(this));
  #appTokenReqBody;

  constructor(uid, secret, redirectUri) {
    if (!uid || !secret) {
      throw new Error("api42: Missing 42API app credentials");
    }
    this.#uid = uid;
    this.#secret = secret;
    this.#redirectUri = redirectUri;

    // Pre-build the token request body
    const appTokenParams = new URLSearchParams();
    appTokenParams.append("grant_type", "client_credentials");
    appTokenParams.append("client_id", uid);
    appTokenParams.append("client_secret", secret);
    this.#appTokenReqBody = appTokenParams.toString();    
  }
  
  /**
   * Set `debug mode` to either `true` or `false`. While
   * set to `true`, the client announce endpoints it fetches
   * and token related informations throught `console.warn()`
   * @param {boolean} mode the expected mode
   */
  setDebugMode(mode) {
    this.#debugmode = mode;
  }

  getSecretValidUntil() {
    return (this.#token.secret_valid_until);
  }

  /**
   * Returns the API authorize url
   * @returns {string} the url
   */
  getOAuthUrl() {
    if (!this.#redirectUri) {
      throw new Error(`api42: Undefined redirect URI`);
    }
    return `${this.#oauthEndpoint}?response_type=code&client_id=${this.#uid}&redirect_uri=${this.#redirectUri}&scope=${this.#oauthScopes.join(" ")}`;
  }

/* ************************************************************************** */
/*                              TOKEN MANAGEMENT                              */
/* ************************************************************************** */

  /**
   * Return an access token belonging to the application
   * If a valid token is stored, it is returned
   * If an expired token is stored, a new one is generated and returned
   * If a close to expire token is stored, a new one is generated and returned
   * If no token are stored, a new one is generated and returned
   * @returns {string} The access token
   */
  async #getAppToken() {
    // Return current access token as long as it exist and is still valid
    if (this.#token && Date.now() < this.#token.expires_at - 1000) {
      return this.#token.access_token;
    }

    // Make sure the token has expired before requesting a new one
    await this.#waitUntilTokenExpires();

    // Generate a new appplication owned access token and returns it
    if (this.#debugmode) console.warn(`api42: Generating new token`);
    const response = await fetch(API_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: this.#appTokenReqBody,
    });
    if (!response.ok) {
      if (this.#debugmode) console.error(`api42: HTTP error! ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! ${response.status} ${response.statusText}`);
    }
    this.#token = await response.json();
    
    // Compute expiry time
    this.#token.expires_at = Date.now() + this.#token.expires_in * 1000;
    this.#token.secret_valid_until *= 1000;
    return this.#token.access_token;
  }

   // Wait until the token is about to expire
   async #waitUntilTokenExpires() {
    const timeRemaining = this.#token ? this.#token.expires_at - Date.now() + 1000 : 0;
    const waitTime = timeRemaining > 0 ? timeRemaining : 0;

    if (waitTime > 0) {
      if (this.#debugmode) console.warn(`api42: Token is about to expire in ${Math.round(waitTime / 1000)} seconds. Waiting for expiry...`);
      // Delay the next action until the token expires
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  async #getUserToken(token) {
    // Return the user access token as long as it is not close to expire
    if (Date.now() < token.expires_at - 1000 * 60 * 5) {
      return token.access_token;
    }

    // Refresh the token and returns it
    token = this.refreshUserToken(token);
    return token.access_token;
  }

  /**
   * Generate a new User owned access token and returns it
   * @param {string} code The code resulting of an authentification through getOAuthUrl()
   */
  async generateUserToken(code) {
    if (this.#debugmode) console.warn(`api42: Generating user owned token`);
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: this.#uid,
      client_secret: this.#secret,
      redirect_uri: this.#redirectUri,
    });
    const response = await fetch(`${this.#site}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!response.ok) {
      throw new Error(`api42: HTTP error! ${response.status} ${response.statusText}`);
    }

    // Compute expiry time
    const token = await response.json();
    this.#token.secret_valid_until = token.secret_valid_until * 1000;
    token.expires_at = Date.now() + token.expires_in * 1000;
    return token;
  }

  /**
   * Refresh a User owned access token and returns it
   * @param {any} token The token to refresh
   */
  async refreshUserToken(token) {
    if (this.#debugmode) console.warn(`api42: Refreshing user owned token`);
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', token.refresh_token);
    params.append('client_id', this.#uid);
    params.append('client_secret', this.#secret);

    const response = await fetch(`${this.#site}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!response.ok) {
      throw new Error(`api42: HTTP error! status: ${response.status}`);
    }
    token = await response.json();

  }

  async #fetchTemplate(endpoint, pagination = false, attempt = 0, token = null) {
    const accessToken = token ? await this.#getUserToken(token) : await this.#getAppToken()
    if (this.#debugmode) console.warn(`${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      if (this.#debugmode) console.error(`api42: HTTP error! ${response.status} ${response.statusText}`);
      if (response.status === 429 && attempt < 5) {
        return this.#fetch(endpoint, pagination, attempt + 1, token)
      }
      throw new Error(`HTTP error! ${response.status} ${response.statusText}`);
    }
    if (pagination) {
      const links = parse(response.headers.get("link"));
      return {
        next: links && links.next ? links.next.url : null,
        responseJson: response.json(),
      };
    }
    return await response.json();
  }

  async #paginatedFetch(endpoint, pageSize = 100, attempt, token) {
    endpoint = addPageSize(endpoint, pageSize);
    const pages = [];
    let response;
    do {
      response = await this.#fetch(endpoint, 1, attempt, token);
      pages.push(...(await response.responseJson));
      endpoint = response.next;
    } while (response.next);
    return pages;
  }

/* ************************************************************************** */
/*                                 API  CALLS                                 */
/* ************************************************************************** */

/**
 * Fetches data from the specified API endpoint using the `GET` method.
 * Handles both simple and paginated requests.
 * @param {string} endpoint - The API endpoint to fetch, relative to the base URL.
 *                           Refer to `https://api.intra.42.fr/apidoc` for available endpoints.
 * @param {object} [options=null] - Optional configuration for the request.
 * @param {number} [options.pageSize] - If provided, enables paginated fetching, specifying the number of items per page.
 * @param {string} [options.token] - An optional authorization token. Previously generated using the `generateUserToken()` method
 *                                  Unless specified, the client uses it's own authorization token.
 * @returns {Promise<object | object[]>} - Resolves to the API response
 * 
 * @throws {Error} - Throws an error if the request fails (e.g., network issues, invalid endpoint, or unauthorized access).
 * 
 * @example
 * // Fetch a single page of data:
 * const data = await client.fetch('/v2/users/ibertran');
 *
 * @example
 * // Fetch all pages of data with pagination:
 * const data = await client.fetch('/v2/users', { pageSize: 100, token: token });
 */
  async fetch(endpoint, options = null) {
    if (options && options.pageSize) {
      return this.#paginatedFetch(
        appendOptions(`${this.#site}${endpoint}`, options),
        options.pageSize,
        0,
        options ? options.token : null
      );
    }
    return this.#fetch(
      appendOptions(`${this.#site}${endpoint}`, options),
      false,
      0,
      options ? options.token : null
    );
  }

  /**
   * Get a User
   * @param {string | number} user The id or login of a User
   * @returns {Promise<User>} - Resolves to the API response 
   */
  async getUser(user) {
    const response = await this.#fetch(`${this.#site}/v2/users/${user}`);
    return new User(this, response);
  }

  async getCampusLocations(campus, active) {
    let url = `${this.#site}/v2/campus/${campus}/locations`;
    if (active !== undefined) url += `?filter[active]=${active}`;
    url += "&sort=host";
    return await this.#paginatedFetch(url);
  }

  async getUserLogtime(userID, begin, end) {
    let url = `${this.#site}/v2/users/${userID}/locations_stats`;
    if (begin && end) {
      url += `?begin_at=${begin}&end_at=${end}`;
    }
    let logtime = 0;
    Object.entries(await this.#fetch(url)).forEach(([date, time]) => {
      logtime += timeToSeconds(time);
    });
    return logtime;
  }

  /**
   * Get location stats of a User
   * @param {string | number} user The login or id of a User
   * @param {date=} begin optional begin date
   * @param {date=} end optional end date
   * @returns {object} 
   */
  async getUserLocationsStats(user, begin, end) {
    let url = `${this.#site}/v2/users/${user}/locations_stats`;
    if (begin && end) {
      url += `?begin_at=${begin}&end_at=${end}`;
    } else if (begin) {
      url += `?begin_at=${begin}`
    }
    return await this.#fetch(url);
  }

  /**
   * Return all the users of the given Campus
   * @param {number} campusId - the campus id
   * @param {object=} options - optional filter options
   * @returns {User[]}
   */
  async getCampusUsers(campusId, options) {
    const url = `${this.#site}/v2/campus/${campusId}/users`;
    const response = await this.#paginatedFetch(options ? appendOptions(url, options) : url);
    return response.map(user => new User(this, user));
  }

  async getCursusProjects(cursus) {
    return await this.#paginatedFetch(`${this.#site}/v2/cursus/${cursus}/projects`);
  }

  async getUserProjectsUsers(user) {
    return await this.#paginatedFetch(`${this.#site}/v2/users/${user}/projects_users`);
  }

  async getEventUsers(eventId) {
    return await this.#paginatedFetch(`${this.#site}/v2/events/${eventId}/events_users`);
  }

  async getTitleUsers(titleId) {
    return await this.#paginatedFetch(`${this.#site}/v2/titles/${titleId}/titles_users`);
  }

  async getGroupUsers(groupId) {
    return await this.#paginatedFetch(`${this.#site}/v2/groups/${groupId}/groups_users`);
  }

  async getUserCoalitionUsers(userId) {
    const response = await this.#paginatedFetch(`${this.#site}/v2/users/${userId}/coalitions_users`);
    return response.map(coalitionUser => new CoalitionUser(this, coalitionUser));
  }

  async getCoalition(id) {
    return await this.#fetch(`${this.#site}/v2/coalitions/${id}`);
  }

  async getAllCursus() {
    return await this.#paginatedFetch(`${this.#site}/v2/cursus`);
  }

  async getAllGroups() {
    return await this.#paginatedFetch(`${this.#site}/v2/groups`);
  }

  async getAllTitles() {
    return await this.#paginatedFetch(`${this.#site}/v2/titles`);
  }

  /**
 * Return all the correction point historics of the given User.
 * @param {Number} id - the User id
 * @param {Object=} options - optional filter options
 * @param {String[]} options.reasons - string Array of reasons to filter
 * @param {Object=} options.range - optional range filter values
 * @param {Object} options.range.min - minimun value
 * @param {Object} options.range.max - maximum value
 */
  async getUserCorrectionPointHistorics(id, options) {
    let url = `${this.#site}/v2/users/${id}/correction_point_historics`;
    if (options.range) {
      url.indexOf("?") > 1 ? (url += "&") : (url += "?");
      url += `range[updated_at]=${options.range.min},${options.range.max}`;
    }
    if (options.reasons) {
      url.indexOf("?") > 1 ? (url += "&") : (url += "?");
      url += "filter[reason]=" + options.reasons.map(r => r).join(",");
    }
    return await this.#paginatedFetch(url);
  }

  /**
   * Get a project
   * @param {string|number} id - the project id
   */
  async getProject(id) {
    return this.#fetch(`${this.#site}/v2/projects/${id}`);
  }

  /**
   * Return all the projects users of the given Project
   * @param {Number} id - the Project id
   * @param {Object=} options - optional filter options
   * @returns {[]}
   */
  async getProjectProjectUsers(id, options) {
    const url = `${this.#site}/v2/projects/${id}/projects_users`;
    if (!options) {
      return this.#paginatedFetch(url);
    }
    return this.#paginatedFetch(appendOptions(url, options));
  }

  /**
   * Return all the projects users of the given Project
   * @param {Number} id - the Project id
   * @param {Object=} options - optional filter options
   * @returns {[object]}
   */
  async getProjectProjectUsers(id, options) {
    const url = `${this.#site}/v2/projects/${id}/projects_users`;
    if (!options) {
      return this.#paginatedFetch(url);
    }
    return this.#paginatedFetch(appendOptions(url, options));
  }

  /**
   * Return all the project sessions of the given Project
   * @param {Number} id - the Project id
   * @returns {[object]}
   */
  async getProjectProjectSessions(id) {
    return this.#paginatedFetch(`${this.#site}/v2/projects/${id}/project_sessions`);
  }

/* ************************************************************************** */
/*                          SPECIFIC TO TOKEN OWNERS                          */
/* ************************************************************************** */

  /**
   * Return the token owner
   * @param {object} token
   */
  async whoAmI(token) {
    return this.#fetch(`${this.#site}/v2/me`, false, 0, token);
  }
};
