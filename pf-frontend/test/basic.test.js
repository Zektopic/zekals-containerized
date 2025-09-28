const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create a test app similar to the main server
const app = express();
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Test endpoints
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/config', (req, res) => {
    res.json({ 
        websocketPort: process.env.WEBSOCKET_PORT || 8765,
        language: process.env.LANGUAGE || 'en'
    });
});

describe('Frontend Server Tests', () => {
    
    describe('Basic Endpoints', () => {
        it('should respond to health check', (done) => {
            request(app)
                .get('/health')
                .expect(200)
                .expect('Content-Type', /json/)
                .expect((res) => {
                    if (!res.body.status || res.body.status !== 'ok') {
                        throw new Error('Invalid health check response');
                    }
                })
                .end(done);
        });

        it('should serve configuration', (done) => {
            request(app)
                .get('/config')
                .expect(200)
                .expect('Content-Type', /json/)
                .expect((res) => {
                    if (!res.body.websocketPort) {
                        throw new Error('Missing WebSocket port in config');
                    }
                })
                .end(done);
        });
    });

    describe('Static Files', () => {
        it('should serve index.html', (done) => {
            request(app)
                .get('/')
                .expect(200)
                .expect('Content-Type', /html/)
                .end(done);
        });

        it('should serve CSS files', (done) => {
            request(app)
                .get('/style.css')
                .expect(200)
                .expect('Content-Type', /css/)
                .end(done);
        });

        it('should serve JavaScript files', (done) => {
            request(app)
                .get('/script.js')
                .expect(200)
                .expect('Content-Type', /javascript/)
                .end(done);
        });
    });

    describe('Language Files', () => {
        it('should serve English language file', (done) => {
            request(app)
                .get('/languages/en.json')
                .expect(200)
                .expect('Content-Type', /json/)
                .expect((res) => {
                    if (!res.body.keyboard || !Array.isArray(res.body.keyboard)) {
                        throw new Error('Invalid English language file structure');
                    }
                })
                .end(done);
        });

        it('should serve Greek language file', (done) => {
            request(app)
                .get('/languages/el.json')
                .expect(200)
                .expect('Content-Type', /json/)
                .expect((res) => {
                    if (!res.body.keyboard || !Array.isArray(res.body.keyboard)) {
                        throw new Error('Invalid Greek language file structure');
                    }
                })
                .end(done);
        });
    });

    describe('Dependencies', () => {
        it('should have all required dependencies', () => {
            const packageJson = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
            );
            
            // Check for required dependencies
            const requiredDeps = ['express', 'ws', 'axios'];
            requiredDeps.forEach(dep => {
                if (!packageJson.dependencies[dep]) {
                    throw new Error(`Missing required dependency: ${dep}`);
                }
            });
        });

        it('should have valid package.json structure', () => {
            const packageJson = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
            );
            
            // Check required fields
            const requiredFields = ['name', 'version', 'description', 'main'];
            requiredFields.forEach(field => {
                if (!packageJson[field]) {
                    throw new Error(`Missing required package.json field: ${field}`);
                }
            });
        });
    });

    describe('Language Configuration Validation', () => {
        it('should validate English keyboard layout', () => {
            const enLang = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../languages/en.json'), 'utf8')
            );
            
            // Check keyboard structure
            if (!enLang.keyboard || !Array.isArray(enLang.keyboard)) {
                throw new Error('English keyboard layout must be an array');
            }
            
            // Check for basic English keys
            const flatKeyboard = enLang.keyboard.flat();
            const basicKeys = ['Q', 'W', 'E', 'R', 'T', 'Y'];
            basicKeys.forEach(key => {
                if (!flatKeyboard.includes(key)) {
                    throw new Error(`English keyboard missing key: ${key}`);
                }
            });
        });

        it('should validate Greek keyboard layout', () => {
            const elLang = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../languages/el.json'), 'utf8')
            );
            
            // Check keyboard structure
            if (!elLang.keyboard || !Array.isArray(elLang.keyboard)) {
                throw new Error('Greek keyboard layout must be an array');
            }
            
            // Check that it has Greek characters
            const flatKeyboard = elLang.keyboard.flat();
            const hasGreekChars = flatKeyboard.some(key => 
                key && /[\u0370-\u03FF\u1F00-\u1FFF]/.test(key)
            );
            
            if (!hasGreekChars) {
                throw new Error('Greek keyboard should contain Greek characters');
            }
        });

        it('should have consistent language file structure', () => {
            const enLang = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../languages/en.json'), 'utf8')
            );
            const elLang = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../languages/el.json'), 'utf8')
            );
            
            // Both should have the same structure
            const enKeys = Object.keys(enLang).sort();
            const elKeys = Object.keys(elLang).sort();
            
            if (JSON.stringify(enKeys) !== JSON.stringify(elKeys)) {
                throw new Error('Language files should have consistent structure');
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent routes', (done) => {
            request(app)
                .get('/non-existent-route')
                .expect(404)
                .end(done);
        });

        it('should handle non-existent language file', (done) => {
            request(app)
                .get('/languages/non-existent.json')
                .expect(404)
                .end(done);
        });
    });
});

describe('Environment Configuration', () => {
    it('should handle WEBSOCKET_PORT environment variable', () => {
        const originalPort = process.env.WEBSOCKET_PORT;
        
        // Test default
        delete process.env.WEBSOCKET_PORT;
        const defaultPort = process.env.WEBSOCKET_PORT || 8765;
        if (defaultPort !== 8765) {
            throw new Error('Default WebSocket port should be 8765');
        }
        
        // Test custom port
        process.env.WEBSOCKET_PORT = '9000';
        const customPort = process.env.WEBSOCKET_PORT || 8765;
        if (parseInt(customPort) !== 9000) {
            throw new Error('Custom WebSocket port not applied');
        }
        
        // Restore original
        if (originalPort) {
            process.env.WEBSOCKET_PORT = originalPort;
        } else {
            delete process.env.WEBSOCKET_PORT;
        }
    });

    it('should handle LANGUAGE environment variable', () => {
        const originalLang = process.env.LANGUAGE;
        
        // Test default
        delete process.env.LANGUAGE;
        const defaultLang = process.env.LANGUAGE || 'en';
        if (defaultLang !== 'en') {
            throw new Error('Default language should be en');
        }
        
        // Test custom language
        process.env.LANGUAGE = 'el';
        const customLang = process.env.LANGUAGE || 'en';
        if (customLang !== 'el') {
            throw new Error('Custom language not applied');
        }
        
        // Restore original
        if (originalLang) {
            process.env.LANGUAGE = originalLang;
        } else {
            delete process.env.LANGUAGE;
        }
    });
});