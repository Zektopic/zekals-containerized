const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:18127', headless: true },
  webServer: { command: 'node server.js', env: { PORT: '18127', ALLOWED_ORIGINS: 'http://127.0.0.1:18127' }, url: 'http://127.0.0.1:18127/health', reuseExistingServer: false },
});
