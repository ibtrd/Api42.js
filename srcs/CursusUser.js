module.exports.CursusUser = class CursusUser {
	#api;

	constructor(api, response) {
		Object.assign(this, response); 
		this.#api = api;
	}

 /**
  * Get location stats from the `begin_at` to the `end_at` dates of the cursus_user.
  */
	async getCursusUserLocationsStats() {
		return this.#api.getUserLocationsStats(
			this.user.id,
			this.begin_at,
			this.end_at ? new Date(new Date(this.end_at).setDate(new Date(this.end_at).getDate() + 1)).toISOString() : null
		);
	}
};
