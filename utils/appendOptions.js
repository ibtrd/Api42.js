module.exports.appendOptions = function (url, options) {
  if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
          url.indexOf("?") > 1 ? (url += "&") : (url += "?");
          url += `filter[${key}]=${value}`;
    }
  }
  if (options.range) {
      for (const [key, value] of Object.entries(options.range)) {
          url.indexOf("?") > 1 ? (url += "&") : (url += "?");
          url += `range[${key}]=${value[0]},${value[1]}`;
      }
  }
  return (url);
};
