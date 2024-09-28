const { CursusUser } = require("./CursusUser");

module.exports.User = class User {
	#api;

	constructor(api, response) {
		Object.assign(this, response);
		this.#api = api;
		this.cursus_users = this.cursus_users.map(e => new CursusUser(this.#api, e))
	}

	async getCoalitionUsers() {
		this.coalition_users = await this.#api.getUserCoalitionUsers(this.id);
		return this.coalition_users;
	}

	async getCorrectionPointHistorics(options) {
		this.correctionPointHistorics = await this.#api.getUserCorrectionPointHistorics(this.id, options);
		return this.correctionPointHistorics;
	}
};
