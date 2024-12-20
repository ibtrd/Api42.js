/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CoalitionUser.js                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ibertran <ibertran@student.42lyon.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/12/05 13:23:21 by ibertran          #+#    #+#             */
/*   Updated: 2024/12/05 13:23:22 by ibertran         ###   ########lyon.fr   */
/*                                                                            */
/* ************************************************************************** */

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