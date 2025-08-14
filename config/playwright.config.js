const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../scenarios/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: '../reports/playwright-report' }]],
  
  use: {
    baseURL: process.env.BASE_URL || 'https://m.oddgrocer.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 667 }
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 }
      },
    },
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'echo "Using external server"',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});