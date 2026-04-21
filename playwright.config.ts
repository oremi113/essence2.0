import { defineConfig, devices } from '@playwright/test';

// When PLAYWRIGHT_BASE_URL is set, tests run against that URL instead of
// Playwright's auto-spawned dev server on :4000. Useful when a dev server
// is already running on another port (Next.js holds a per-project lock on
// .next/dev/lock, so you can't run two `next dev` instances side by side).
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: externalBaseUrl ?? 'http://localhost:4000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'PORT=4000 npm run dev',
        url: 'http://localhost:4000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
