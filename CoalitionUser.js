module.exports.CoalitionUser = class CoalitionUser {
	#api;

	constructor(api, response) {
		Object.assign(this, response); 
		this.#api = api;
	}

	async getCoalition() {
		this.coalition = await this.#api.getCoalition(this.coalition_id);
		return this.coalition;
	}
};