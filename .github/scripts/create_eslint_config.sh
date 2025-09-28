#!/bin/bash
set -e

# Create the eslint config file
cat > pf-frontend/.eslintrc.js << 'EOF'
module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12
    },
    "rules": {
        "no-unused-vars": "warn",
        "no-console": "off"
    }
};
EOF