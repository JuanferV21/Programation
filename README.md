# SecureAuth

This repository contains the SecureAuth application and related scripts.

## Running Tests

Tests reside inside the `app` directory. Before executing them you must install the Node.js dependencies for that project:

```bash
cd app
npm install
npm test
```

Alternatively you can use the helper script in the repository root:

```bash
./run-tests.sh
```

It will install dependencies in `app` (if not already installed) and then run the test suite.

## Authentication Cookie

When you log in, the server sends a `token` cookie containing the session JWT. The `secure` attribute of this cookie depends on the `NODE_ENV` environment variable: it is only enabled in production. In development the cookie is also served over HTTP for convenience.
