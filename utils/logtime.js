/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   logtime.js                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ibertran <ibertran@student.42lyon.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/12/05 13:23:32 by ibertran          #+#    #+#             */
/*   Updated: 2024/12/05 13:23:34 by ibertran         ###   ########lyon.fr   */
/*                                                                            */
/* ************************************************************************** */

// Function to convert time (HH:MM:SS.SSS) to seconds
module.exports.timeToSeconds = function (time) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

// Function to convert seconds back to HH:MM:SS format
module.exports.secondsToTime = function (seconds) {
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds.toFixed(3)).padStart(6, "0")}`;
}
