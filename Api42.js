const throttledQueue = require('throttled-queue');
const parse = require("parse-link-header");
const { timeToSeconds } = require('./utils/logtime');
const { tokenOptions } = require('./utils/tokenOpions');

module.exports.Api42 = class Api42 {
  #token;
  #expiration;
  #throttle;

  constructor() {
    this.#throttle = throttledQueue(2, 1050, true);
  }

  async #getToken() {
    if (this.#token && Date.now() < this.#expiration) return;

    await fetch("https://api.intra.42.fr/oauth/token", tokenOptions)
      .then((response) => {
        if (response.ok) return response.json();
        throw new Error("Failed to generate 42Api token", response.json());
      })
      .then((responseJson) => {
        this.#token = responseJson.access_token;
        this.#expiration = responseJson.secret_valid_until * 1000;
        console.warn("42API token generated.");
      })
  }

  async #fetchUrl(endpoint, pagination) {
    try {
      await this.#getToken();
    } catch {
      return ;
    }
    console.warn(`${endpoint}`);
    return this.#throttle(() => {
      const responseJson = fetch(`${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.#token}`,
        },
      }).then((response) => {
        if (response.ok) {
          if (pagination) {
            var links = parse(response.headers.get("link"));
            return {
              next: (links && links.next) ? links.next.url : null,
              responseJson: response.json()
            };
          } else {
            return response.json();
          }
        }
        response.json().then((responseJson) => {
          console.error(responseJson);
        });
        throw new Error(
          `Failed to fetch ${endpoint}`,
        );
      });
      return responseJson;
    });
  }

  async #paginatedFetch(endpoint, perPage) {
    if (!perPage)
      perPage = 100;
    endpoint.indexOf("?") > 1 ? (endpoint += "&") : (endpoint += "?");
    endpoint += `per_page=${perPage}`;
    
    var responsesJson = [];
    do {
      var response = await this.#fetchUrl(endpoint, 1);
      responsesJson.push(...(await response.responseJson));
      endpoint = response.next;
    } while (response.next);
    return (responsesJson);
  }

  async getUser(user) {
    return this.#fetchUrl(`https://api.intra.42.fr/v2/users/${user}`);
  }

  async getCampusLocations(campus, active) {
    let url = `https://api.intra.42.fr/v2/campus/${campus}/locations`;
    if (active !== undefined)
      url += `?filter[active]=${active}`;
    url += '&sort=host';
    return await this.#paginatedFetch(url);
  }

  async getPisciners(campus, year, month) {
    let url = `https://api.intra.42.fr/v2/campus/${campus}/users`;
    if (year && month) {
      url += `?filter[pool_year]=${year}&filter[pool_month]=${month}`;
    } else if (year) {
      url += `?filter[pool_year]=${year}`;
    }
    return this.#paginatedFetch(url);
  }

  async getUserLogtime(userID, begin, end) {
    let url = `https://api.intra.42.fr/v2/users/${userID}/locations_stats`;
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
    return this.#fetchUrl(`https://api.intra.42.fr/v2/campus/${campus}/users`);
  }

  async getCursusProjects(cursus) {
    return await this.#paginatedFetch(
      `https://api.intra.42.fr/v2/cursus/${cursus}/projects`
    );
  }

  async getUserProjects(user) {
    return await this.#paginatedFetch(
      `https://api.intra.42.fr/v2/users/${user}/projects_users`
    );
  }
};
