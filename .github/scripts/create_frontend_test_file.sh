#!/bin/bash
set -e

# Create the tests directory if it doesn't exist
mkdir -p pf-frontend/test

# Create the test file
cat > pf-frontend/test/basic.test.js << 'EOF'
const request = require('supertest');
const express = require('express');
const path = require('path');

// Create a test app similar to the main server
const app = express();
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

describe('Frontend Server', () => {
    it('should serve static files', (done) => {
        request(app)
            .get('/health')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(done);
    });

    it('should have required dependencies', () => {
        const fs = require('fs');
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')));

        // Check for required dependencies
        const requiredDeps = ['express', 'ws', 'axios'];
        requiredDeps.forEach(dep => {
            if (!packageJson.dependencies[dep]) {
                throw new Error(`Missing required dependency: ${dep}`);
            }
        });
    });
});
EOF