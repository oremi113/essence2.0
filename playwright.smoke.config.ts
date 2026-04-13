import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const PORT = 4100;
const FAKE_AUDIO = path.resolve(__dirname, 'tests/smoke/fixtures/fake-audio.wav');

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${FAKE_AUDIO}`,
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `PORT=${PORT} npm run dev`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
