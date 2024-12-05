/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   User.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ibertran <ibertran@student.42lyon.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/12/05 13:23:15 by ibertran          #+#    #+#             */
/*   Updated: 2024/12/05 13:23:17 by ibertran         ###   ########lyon.fr   */
/*                                                                            */
/* ************************************************************************** */

const { CursusUser } = require("./CursusUser");

module.exports.User = class User {
	#api;

	constructor(api, response) {
		Object.assign(this, response);
		this.#api = api;
		if (this.cursus_users)
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

	isActive() {
		return (this['active?']);
	}

	// async hasCursus(cursusId) {
	// 	if (!this.cursus_users) {
	// 		this.cursus_users = 
	// 	}
	// 	return (this.cursus_users.find(cursus => cursus.id === cursusId));
	// }
};
