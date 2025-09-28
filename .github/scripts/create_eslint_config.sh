#!/bin/bash
set -e

# Create the eslint config file
cat > pf-frontend/eslint.config.js << 'EOF'
const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
        ecmaVersion: 2021,
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.commonjs
        }
    },
    rules: {
        "no-unused-vars": "warn",
        "no-console": "off"
    }
  }
];
EOF