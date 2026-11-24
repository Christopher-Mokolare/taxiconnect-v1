const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.TAXICONNECT_BASE_URL || 'https://taxiconnect-dev.web.app',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 390, height: 844 },
    actionTimeout: 12_000,
    navigationTimeout: 25_000
  }
});
