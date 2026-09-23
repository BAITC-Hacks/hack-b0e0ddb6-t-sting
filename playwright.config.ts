import { defineConfig, devices } from '@playwright/test';

// Dedicated ports keep the test servers separate from the development stack.
const webURL = 'http://127.0.0.1:5174';
const apiURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: webURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command:
        'npm run build -w @app/api && npm run migration:run && npm start -w @app/api',
      url: `${apiURL}/api/health`,
      env: { API_PORT: '3100', OPENAI_API_KEY: '' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w @app/web -- --host 127.0.0.1',
      url: webURL,
      env: { WEB_PORT: '5174', API_PROXY_TARGET: apiURL },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
