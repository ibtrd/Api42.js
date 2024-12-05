/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageSize.js                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ibertran <ibertran@student.42lyon.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/12/05 13:23:05 by ibertran          #+#    #+#             */
/*   Updated: 2024/12/05 13:23:07 by ibertran         ###   ########lyon.fr   */
/*                                                                            */
/* ************************************************************************** */

function addPageSize(url, pageSize) {
    if (url.indexOf("?") > 1) {
        return url + `&per_page=${pageSize}`;
    }
    return url + `?per_page=${pageSize}`;
}

module.exports = addPageSize;
