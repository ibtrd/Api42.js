const throttledQueue = require('throttled-queue');
const parse = require("parse-link-header");
const { timeToSeconds } = require('./utils/logtime');
const { tokenOptions } = require('./utils/tokenOpions');
const { User } = require('./User');
const { CoalitionUser } = require('./CoalitionUser');
const { appendOptions } = require('./utils/appendOptions');

const throttle = throttledQueue(2, 1100, true);

module.exports.Api42 = class Api42 {
  #token;
  #expiration;
  #secretValidUntil;

  #uid;
  #secret;
  #redirectUri;

  #site = "https://api.intra.42.fr";
  #oauthEndpoint = "https://api.intra.42.fr/oauth/authorize";
  #oauthScopes =  ["public"];

  constructor(config) {
    if (config) {
      this.#uid = config.uid;
      this.#secret = config.secret;
      this.#redirectUri = config.redirectUri;
    } else {
      this.#uid = process.env.API42_UID;
      this.#secret = process.env.API42_SECRET;
      this.#redirectUri = process.env.API42_REDIRECT_URI;
    }
  }

  getSecretValidUntil() {
    return (this.#secretValidUntil);
  }

  async #getToken() {
    if (this.#token && Date.now() + 5000 < this.#expiration) {
      return;
    } else if (this.#token) {
      while (Date.now() - 1000 < this.#expiration)
        ;
    }

    await fetch(`${this.#site}/oauth/token`, tokenOptions)
      .then(async (response) => {
        if (response.ok) return response.json();
        if (process.env.API42_DEV) console.error(await response.json(),);
        throw new Error("Failed to generate 42Api token");
      })
      .then((responseJson) => {
        this.#token = responseJson.access_token;
        this.#expiration = responseJson.expires_in * 1000 + Date.now();
        this.#secretValidUntil = responseJson.secret_valid_until;
        console.warn("42API token generated.");
      });
  }

  async #fetchUrl(endpoint, pagination, attempt = 0) {
    await this.#getToken();
    if (process.env.API42_DEV) console.warn(`${endpoint}`);
    return throttle(() => {
      const responseJson = fetch(`${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.#token}`,
        },
      }).then(async (response) => {
        if (!response.ok) {
          if (process.env.API42_DEV) {
            console.error("Error:", {
              status: response.status,
              statusText: response.statusText,
            });
          }
          if (response.status === 429 && attempt < 5)
            return this.#fetchUrl(endpoint, pagination, attempt + 1);
          throw new Error(
            `${response.status} ${response.statusText} - ${endpoint}`
          );
        }
        if (pagination) {
          var links = parse(response.headers.get("link"));
          return {
            next: links && links.next ? links.next.url : null,
            responseJson: response.json(),
          };
        } else {
          return response.json();
        }
      });
      return responseJson;
    });
  }

  getOAuthUrl() {
    if (!this.#redirectUri) {
      throw new Error(`42api: undefined redirect URI`);
    } else if (!this.#uid) {
      throw new Error(`42api: undefined client UID`);
    }
    return `${this.#oauthEndpoint}?response_type=code&client_id=${this.#uid}&redirect_uri=${this.#redirectUri}&scope=${this.#oauthScopes.join(" ")}`;
  }

  async #paginatedFetch(endpoint, perPage) {
    if (!perPage) perPage = 100;
    endpoint.indexOf("?") > 1 ? (endpoint += "&") : (endpoint += "?");
    endpoint += `per_page=${perPage}`;

    var responsesJson = [];
    do {
      var response = await this.#fetchUrl(endpoint, 1);
      responsesJson.push(...(await response.responseJson));
      endpoint = response.next;
    } while (response.next);
    return responsesJson;
  }

  async fetchEndpoint(endpoint) {
    return this.#fetchUrl(`${this.#site}${endpoint}`);
  }

  async paginatedFetchEndpoint(endpoint) {
    return this.#paginatedFetch(`${this.#site}${endpoint}`);
  }

  /**
   * Get a User
   * @param {string | number} user The login or id of a User
   * @returns {User} 
   */
  async getUser(user) {
    const response = await this.#fetchUrl(`${this.#site}/v2/users/${user}`);
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
    Object.entries(await this.#fetchUrl(url)).forEach(([date, time]) => {
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
    return await this.#fetchUrl(url);
  }

  /**
   * Return all the users of the given Campus
   * @param {number} campusId - the campus id
   * @param {number|string=} poolYear - optional pool year to filter
   * @param {string=} poolMonth - optional pool month to filter
   * @returns {User[]}
   */
  async getCampusUsers(campusId, poolYear, poolMonth) {
    let url = `${this.#site}/v2/campus/${campusId}/users`;
    if (poolYear) {
      url.indexOf("?") > 1 ? (url += "&") : (url += "?");
      url += `filter[pool_year]=${poolYear}`;
    }
    if (poolMonth) {
      url.indexOf("?") > 1 ? (url += "&") : (url += "?");
      url += `filter[pool_month]=${poolMonth}`;
    }
    const response = await this.#paginatedFetch(url);
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

  /**
   * Description
   * @param {any} id
   * @returns {any}
   */
  async getCoalition(id) {
    return this.#fetchUrl(`${this.#site}/v2/coalitions/${id}`);
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
    return this.#fetchUrl(`${this.#site}/v2/projects/${id}`);
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
   * Return all the project sessions of the given Project
   * @param {Number} id - the Project id
   * @returns {[]}
   */
  async getProjectProjectSessions(id) {
    return this.#paginatedFetch(`${this.#site}/v2/projects/${id}/project_sessions`);
  }
};
