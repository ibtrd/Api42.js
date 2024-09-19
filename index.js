const throttledQueue = require('throttled-queue');
const parse = require("parse-link-header");
const { timeToSeconds } = require('./utils/logtime');
const { tokenOptions } = require('./utils/tokenOpions');

const throttle = throttledQueue(2, 1100, true);

module.exports.Api42 = class Api42 {
  #token;
  #expiration;
  #site = "https://api.intra.42.fr";

  secretValidUntil;

  async #getToken() {
    if (this.#token && Date.now() < this.#expiration) return;

    await fetch(`${this.#site}/oauth/token`, tokenOptions)
      .then(async (response) => {
        if (response.ok) return response.json();
        if (process.env.API42_DEV) console.error(await response.json(),);
        throw new Error("Failed to generate 42Api token");
      })
      .then((responseJson) => {
        this.#token = responseJson.access_token;
        this.#expiration = responseJson.expires_in * 1000 + Date.now();
        this.secretValidUntil = responseJson.secret_valid_until;
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

  async getUser(user) {
    return this.#fetchUrl(`${this.#site}/v2/users/${user}`);
  }

  async getCampusLocations(campus, active) {
    let url = `${this.#site}/v2/campus/${campus}/locations`;
    if (active !== undefined) url += `?filter[active]=${active}`;
    url += "&sort=host";
    return await this.#paginatedFetch(url);
  }

  async getPisciners(campus, year, month) {
    let url = `${this.#site}/v2/campus/${campus}/users`;
    if (year && month) {
      url += `?filter[pool_year]=${year}&filter[pool_month]=${month}`;
    } else if (year) {
      url += `?filter[pool_year]=${year}`;
    }
    return this.#paginatedFetch(url);
  }

  async getUserLogtime(userID, begin, end) {
    let url = `${this.#site}/v2/users/${userID}/locations_stats`;
    if (begin & end) {
      url += `?begin_at=${begin}&end_at=${end}`;
    }
    let logtime = 0;
    Object.entries(await this.#fetchUrl(url)).forEach(([date, time]) => {
      logtime += timeToSeconds(time);
    });
    return logtime;
  }

  async getCampusUsuers(campus) {
    return this.#fetchUrl(`${this.#site}/v2/campus/${campus}/users`);
  }

  async getCursusProjects(cursus) {
    return await this.#paginatedFetch(`${this.#site}/v2/cursus/${cursus}/projects`);
  }

  async getUserProjects(user) {
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
  
  async getAllCursus() {
    return await this.#paginatedFetch(`${this.#site}/v2/cursus`);
  }

  async getAllGroups() {
    return await this.#paginatedFetch(`${this.#site}/v2/groups`);
  }

  async getAllTitles() {
    return await this.#paginatedFetch(`${this.#site}/v2/titles`);
  }

};
