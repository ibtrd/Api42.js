const params = new URLSearchParams();
params.append("grant_type", "client_credentials");
params.append("client_id", process.env.API42_UID);
params.append("client_secret", process.env.API42_SECRET);

module.exports.tokenOptions = {
  method: "POST",
  headers: {
    "Content-TYpe": "application/x-www-form-urlencoded",
  },
  body: params.toString(),
};
