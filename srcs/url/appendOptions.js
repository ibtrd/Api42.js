/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   appendOptions.js                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ibertran <ibertran@student.42lyon.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/12/05 13:23:00 by ibertran          #+#    #+#             */
/*   Updated: 2024/12/15 03:59:43 by ibertran         ###   ########lyon.fr   */
/*                                                                            */
/* ************************************************************************** */

/**
 * Appends formatted filter, range, and additional options to a URL as query parameters.
 *
 * This function accepts a base URL and an options object, then appends 
 * `param`, `filter`, `range`, and `sort` parameters (if present) to the URL.
 * - The `param` values are added directly as `key=value`.
 * - The `filter` values are added as `filter[key]=value`.
 * - The `range` values are added as `range[key]=start,end`.
 * - The `sort` values are added as `sort=value1,value2,...`.
 *
 * @param {string} url - The base URL to which the options will be appended.
 * @param {object} options - An object containing optional parameters to append.
 * @param {object} [options.param] - An object representing additional query parameters.
 *                                    Each key-value pair in the object is added as `key=value`.
 * @param {object} [options.filter] - An object representing filter parameters.
 *                                     Each key-value pair in the object is added 
 *                                     as `filter[key]=value`.
 * @param {object} [options.range] - An object representing range parameters.
 *                                    Each key should map to an array of two numbers
 *                                    [start, end], and is appended as 
 *                                    `range[key]=start,end`.
 * @returns {string} - The URL with the appended query parameters.
 *
 * @example
 * const baseUrl = "https://api.intra.42.fr/v2/users";
 * const options = {
 *      filter: { pool_month: "july" },
 *      range: { pool_year: [2022, 2024] }
 * };
 * 
 * const fullUrl = appendOptions(baseUrl, options);
 * console.log(fullUrl);
 * // Output: "https://api.intra.42.fr/v2/users?filter[pool_month]=july&range[pool_year]=2022,2024"
 */
function appendOptions(url, options) {
  if (!options)
      return (url);
  if (options.param) {
    for (const [key, value] of Object.entries(options.param)) {
        url.indexOf("?") > 1 ? (url += "&") : (url += "?");
        url += `${key}=${value}`;
    }
  }
  if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
          url.indexOf("?") > 1 ? (url += "&") : (url += "?");
          url += `filter[${key}]=${value.lenth ? value.join(',') : value}`;
    }
  }
  if (options.range) {
      for (const [key, value] of Object.entries(options.range)) {
          url.indexOf("?") > 1 ? (url += "&") : (url += "?");
          url += `range[${key}]=${value[0]},${value[1]}`;
      }
  }
//   if (options.sort) {
//     url.indexOf("?") > 1 ? (url += "&sort=") : (url += "?sort=");
//     if (options.sort.length) {
//         url += options.sort.join(',');
//     } else {
//         url += options.sort;
//     }
//   }
  return (url);
};

module.exports = appendOptions;
