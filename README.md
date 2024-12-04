# Api42.js
A Node.js module that provides an easy-to-use interface for interacting with the 42 API.

## Installation

Install the module via npm:
```bash
npm install @ibertran/api42
```

## Usage

To use this module, instantiate the Api42 class exported by the package:

```js
const { Api42 } = require("@ibertran/api42");

// Create an instance of the API client
const api42 = new Api42(client_uid, client_secret, redirect_uri);
```

## Parameters

- client_uid: Your application ID (string).
- client_secret: Your application secret (string).
- redirectUri: The redirect URI configured for your application (string).

The `uid` and `secret` are both mandatory for any usage while the `redirectUri` is optional and only required for the [OAuth2 flow](https://api.intra.42.fr/apidoc/guides/web_application_flow)

## Features
- Token Management: Handles access token retrieval and renewal.
- API Requests: Send requests to 42 endpoints after authentication.
- OAuth2 Authentication: Easily manage authentication with the 42 API.

## Example
```js
const { Api42 } = require("@ibertran/api42");

// Replace with your 42API credentials
const uid = "your-client-id";
const secret = "your-client-secret";
const redirectUri = "http://localhost/callback";

const api42 = new Api42(uid, secret, redirectUri);

// Example usage (e.g., get a User information)
const user = await api42.getUser('ibertran');
console.log(user);
```

## API Documentation

🚧 WIP 🚧
