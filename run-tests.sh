#!/bin/bash
# Simple helper to install dependencies and run tests
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/app"
if [ ! -d node_modules ]; then
  npm install
fi
npm test

