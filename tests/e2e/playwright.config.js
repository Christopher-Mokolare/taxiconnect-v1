const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.TAXICONNECT_BASE_URL || 'https://taxiconnect-dev.web.app',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 390, height: 844 },
    actionTimeout: 10_000,
    navigationTimeout: 20_000
  }
});
