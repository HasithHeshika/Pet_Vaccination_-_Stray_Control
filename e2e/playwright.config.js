// End-to-end tests: real browser -> built web app -> real API -> throwaway MongoDB.
// Prerequisites: MongoDB on 127.0.0.1:27077 (e.g. docker run -d --rm -p 27077:27017 mongo:7)
// and "npm run build:web" once after frontend changes.
const { defineConfig, devices } = require('@playwright/test');
const { API_URL, WEB_URL } = require('./scripts/ports');

module.exports = defineConfig({
  testDir: './tests',
  // The journeys share one database and build on each other's data, so run them in order
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }], ['json', { outputFile: 'results/results.json' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] }, testIgnore: /responsive\.spec\.js/ },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.js/ }
  ],
  webServer: [
    { command: 'node scripts/start-api.js', url: `${API_URL}/`, reuseExistingServer: false, timeout: 60_000 },
    { command: 'node scripts/serve-web.js', url: WEB_URL, reuseExistingServer: false, timeout: 30_000 }
  ]
});
