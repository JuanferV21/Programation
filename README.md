# SecureAuth

This repository contains the SecureAuth application and related scripts.

## Environment setup

Copy `app/.env.example` to `app/.env` and fill in your real credentials before running the application:

```bash
cp app/.env.example app/.env
# edit app/.env
```

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
