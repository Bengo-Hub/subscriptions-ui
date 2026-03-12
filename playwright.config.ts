import { defineConfig, devices } from '@playwright/test';

const base = process.env.BASE_URL || 'https://pricing.codevertexitsolutions.com';

/**
 * Playwright E2E config for subscriptions-ui.
 * Set BASE_URL to override. Local runs use headed browser unless CI=true.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: base,
    headless: process.env.CI === 'true',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  timeout: 60_000,
});
