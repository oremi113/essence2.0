import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Walks the record flow and captures a screenshot of each reachable
 * screen. Output: test-results/record-visual/<NN-name>.png.
 *
 * Run: npx playwright test tests/e2e/record-visual-capture.spec.ts
 *      --project=mobile
 * (mobile project gives the iPhone 13 viewport, which is where the
 * --long prompt card's scroll treatment actually matters.)
 */

const OUT_DIR = resolve(process.cwd(), 'test-results/record-visual');
const DEV_ROUTE = '/dev/record';

test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 dimensions
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
});

async function remount(page: Page) {
  await page.getByRole('button', { name: /^Reset$/ }).click();
}

async function setClips(page: Page, n: number) {
  await page.locator('label:has-text("Clips:") input').fill(String(n));
  await page.locator('label:has-text("Clips:") input').blur();
  await remount(page);
}

async function setStatus(page: Page, value: string) {
  await page.locator('label:has-text("Status:") select').selectOption(value);
  await remount(page);
}

async function shot(page: Page, name: string) {
  // Wait for reveal animations (longest delay is ~1700ms for the
  // checklist anchor) before capturing.
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: resolve(OUT_DIR, `${name}.png`),
    fullPage: false, // use the viewport only, since the record flow is single-viewport
    animations: 'disabled',
  });
}

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

test('capture all reachable record-flow screens', async ({ page }) => {
  // Note: fake-ui / fake-device launch args make Chromium skip the
  // mic prompt entirely, so no grantPermissions needed (and it's
  // WebKit-incompatible anyway).

  // 1. Entry
  await page.goto(DEV_ROUTE);
  await shot(page, '01-entry');

  // 2. Grounding
  await page.getByRole('button', { name: /^Begin$/ }).click();
  await shot(page, '02-grounding');

  // 3. Mic permission
  await page.getByRole('button', { name: /I'm ready/i }).click();
  await shot(page, '03-mic-permission');

  // 4. Checklist
  await page.getByRole('button', { name: /Allow microphone/i }).click();
  await shot(page, '04-checklist');

  // 5. Stage 1 intro (through environment auto-advance)
  await page.getByRole('button', { name: /^Begin$/ }).click();
  await page.waitForTimeout(3500); // environment auto-advance
  await shot(page, '05-stage-1-intro');

  // 6. Prompt — short (clips=2 → prompt 3, ~45 words, no --long)
  await setClips(page, 2);
  await shot(page, '06-prompt-short');

  // 7. Prompt — long (clips=18 → prompt 19 bedtime, ~80 words, --long applies)
  await setClips(page, 18);
  await shot(page, '07-prompt-long');

  // 8. Stage 2 intro (clips=5)
  await setClips(page, 5);
  await shot(page, '08-stage-2-intro');

  // 9. Stage 3 intro (clips=17)
  await setClips(page, 17);
  await shot(page, '09-stage-3-intro');

  // 10. Working (status=processing)
  await setStatus(page, 'processing');
  await shot(page, '10-working');

  // 11. Ready (status=ready)
  await setStatus(page, 'ready');
  await shot(page, '11-ready');

  // 12. Paused (trigger from stage 2 intro pause link)
  await setStatus(page, 'collecting');
  await setClips(page, 5);
  await page.getByRole('button', { name: /Pause for now/i }).click();
  await shot(page, '12-paused');
});
