const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially to avoid overwhelming the server
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid concurrent test limits
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:8888',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true, // Run in headless mode
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // Explicitly enable headless mode
      },
    },
  ],

  webServer: {
    command: 'npm start',
    port: 8888,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
