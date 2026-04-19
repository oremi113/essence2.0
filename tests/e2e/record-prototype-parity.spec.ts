import { test, expect, type Page } from '@playwright/test';

/**
 * Verifies RecordScreen (React) is a 1:1 copy match with
 * prototypes/voice-recording-flow.html. Walks the reachable flow
 * via /dev/record (no auth, tunable state).
 *
 * Screens that require a real recording (prompt → celebration) are
 * asserted via direct state jumps to the adjacent non-prompt screens
 * only; celebration copy is validated indirectly by the stage intros
 * that follow, plus metadata checks in script.ts (compile-time).
 */

// Fake audio device so getUserMedia succeeds headlessly.
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
});

const DEV_ROUTE = '/dev/record';

// RecordScreen derives view from initial props only — changing the dev
// page's controls won't re-derive unless we also remount. The Reset
// button bumps runId, which is RecordScreen's key, forcing a fresh
// deriveInitialView.
async function remount(page: Page) {
  await page.getByRole('button', { name: /^Reset$/ }).click();
}

async function setClips(page: Page, n: number) {
  const control = page.locator('label:has-text("Clips:") input');
  await control.fill(String(n));
  await control.blur();
  await remount(page);
}

async function setStatus(page: Page, value: string) {
  const control = page.locator('label:has-text("Status:") select');
  await control.selectOption(value);
  await remount(page);
}

test.describe('Record flow — prototype copy parity', () => {
  test('Screen 1 — Entry', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await expect(page.locator('.record-eyebrow')).toHaveText(
      'VOICE KEEPSAKE · 25 MOMENTS'
    );
    await expect(page.locator('.record-title')).toHaveText('Save your voice.');
    await expect(page.locator('.record-subtitle')).toHaveText(
      'Save something only you can give. This is for the people who love you.'
    );
    await expect(page.locator('.record-microcopy')).toHaveText(
      'Twenty-five prompts · 10–15 minutes'
    );
    await expect(page.getByRole('button', { name: /^Begin$/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /I'll do this later/i })
    ).toBeVisible();
  });

  test('Screen 2 — Grounding', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await page.getByRole('button', { name: /^Begin$/ }).click();

    await expect(page.locator('.record-eyebrow')).toHaveText(
      'VOICE KEEPSAKE · BEFORE YOU BEGIN'
    );
    await expect(page.locator('.record-title')).toHaveText('This is for them.');
    await expect(page.locator('.record-subtitle')).toHaveText(
      'Speak as you would to someone who knows you.'
    );
    await expect(page.locator('.record-microcopy')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /I'm ready/i })).toBeVisible();
  });

  test('Screen 3 — Mic permission', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.goto(DEV_ROUTE);
    await page.getByRole('button', { name: /^Begin$/ }).click();
    await page.getByRole('button', { name: /I'm ready/i }).click();

    await expect(page.locator('.record-eyebrow')).toHaveText(
      'VOICE KEEPSAKE · SETUP'
    );
    await expect(page.locator('.record-title')).toHaveText(
      'Your phone needs to hear you.'
    );
    await expect(page.locator('.record-subtitle')).toHaveText(
      'We only record when you tap.'
    );
    await expect(page.locator('.record-microcopy')).toHaveText(
      'Your voice stays yours.'
    );
    await expect(
      page.getByRole('button', { name: /Allow microphone/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Not now/i })).toBeVisible();
    // Redundant hint from old copy should be gone
    await expect(page.locator('.record-mic-hint')).toHaveCount(0);
  });

  test('Screen 4 — Checklist', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.goto(DEV_ROUTE);
    await page.getByRole('button', { name: /^Begin$/ }).click();
    await page.getByRole('button', { name: /I'm ready/i }).click();
    await page.getByRole('button', { name: /Allow microphone/i }).click();

    await expect(page.locator('.record-eyebrow')).toHaveText(
      'VOICE KEEPSAKE · SETUP'
    );
    await expect(page.locator('.record-title')).toHaveText('Before you begin.');

    const items = page.locator('.record-checklist__text');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('Quiet environment');
    await expect(items.nth(1)).toHaveText('Phone at comfortable distance');
    await expect(items.nth(2)).toHaveText('Speak naturally, at your own pace');

    await expect(page.locator('.record-checklist-anchor')).toHaveText(
      'Someone you love, in mind.'
    );
    await expect(page.getByRole('button', { name: /^Begin$/ })).toBeVisible();
  });

  test('Screen 5 — Stage 1 intro (jump via stage-intro flow)', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['microphone']);
    await page.goto(DEV_ROUTE);
    await page.getByRole('button', { name: /^Begin$/ }).click();
    await page.getByRole('button', { name: /I'm ready/i }).click();
    await page.getByRole('button', { name: /Allow microphone/i }).click();
    await page.getByRole('button', { name: /^Begin$/ }).click(); // checklist → env
    // Environment auto-advances after TIMING.ENVIRONMENT_AUTO_READY_MS (~2s).
    // Wait for stage-1-intro to arrive.
    await expect(page.locator('.record-eyebrow')).toHaveText(
      'STAGE 1 OF 3 · EVERYDAY',
      { timeout: 6000 }
    );
    await expect(page.locator('.record-title')).toHaveText(
      /Let.s start with simple moments\./
    );
    // Body is --aside variant (italic Spectral) in stage 1
    const body = page.locator('.record-body.record-body--aside p');
    await expect(body).toHaveText(
      'Take a breath. Nothing here needs to be rehearsed.'
    );
    // Subtitle should be dropped (prototype doesn't render it)
    await expect(page.locator('.record-subtitle')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Begin Stage 1/i })
    ).toBeVisible();
  });

  test('Screen 8 — Stage 2 intro (jump via clips=5)', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await setClips(page, 5);

    await expect(page.locator('.record-eyebrow')).toHaveText(
      'STAGE 2 OF 3 · EMOTIONAL'
    );
    await expect(page.locator('.record-title')).toHaveText(
      'Some of these might stay with you.'
    );
    const body = page.locator('.record-body:not(.record-body--aside) p');
    await expect(body).toHaveText(
      'Think of someone as you read. The words will find them.'
    );
    await expect(page.locator('.record-subtitle')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Begin Stage 2/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Pause for now/i })
    ).toBeVisible();
  });

  test('Screen 11 — Stage 3 intro (jump via clips=17)', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await setClips(page, 17);

    await expect(page.locator('.record-eyebrow')).toHaveText(
      'STAGE 3 OF 3 · PERSONAL'
    );
    await expect(page.locator('.record-title')).toHaveText(
      'These last ones are yours.'
    );
    const body = page.locator('.record-body:not(.record-body--aside) p');
    await expect(body).toHaveText(
      'Read like you mean it. What you say here stays.'
    );
    await expect(page.locator('.record-subtitle')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Begin Stage 3/i })
    ).toBeVisible();
  });

  test('Prompt card --long modifier applies for prompts > 60 words', async ({
    page,
  }) => {
    await page.goto(DEV_ROUTE);

    // Prompt 3 (city) @ clips=2 is ~45 words — should NOT get --long
    await setClips(page, 2);
    await expect(page.locator('.record-prompt-card')).not.toHaveClass(
      /record-prompt-card--long/
    );

    // Prompt 19 (bedtime, daughter variant) @ clips=18 is ~80 words — should get --long
    await setClips(page, 18);
    await expect(page.locator('.record-prompt-card')).toHaveClass(
      /record-prompt-card--long/
    );

    // Scroll wrapper is always present regardless of length
    await expect(page.locator('.record-prompt-card__scroll')).toBeVisible();
  });

  test('Prompt screen eyebrow includes stage category', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await setClips(page, 1);
    await expect(page.locator('.record-eyebrow')).toHaveText(
      'MOMENT 2 OF 25 · EVERYDAY'
    );

    await setClips(page, 6);
    await expect(page.locator('.record-eyebrow')).toHaveText(
      'MOMENT 7 OF 25 · EMOTIONAL'
    );

    await setClips(page, 18);
    await expect(page.locator('.record-eyebrow')).toHaveText(
      'MOMENT 19 OF 25 · PERSONAL'
    );

    // Final prompt keeps the "FINAL MOMENT" label (no suffix)
    await setClips(page, 24);
    await expect(page.locator('.record-eyebrow')).toHaveText('FINAL MOMENT');
  });

  test('Screen 14 — Working', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await setStatus(page, 'processing');

    await expect(page.locator('.record-eyebrow')).toHaveText(
      'SHAPING YOUR VOICE'
    );
    await expect(page.locator('.record-title')).toHaveText(
      'This part takes care.'
    );
    await expect(page.locator('.record-subtitle')).toHaveText(
      'Your voice is being made into something that lasts.'
    );
    await expect(page.locator('.record-microcopy')).toHaveText(
      'This takes a moment'
    );
  });

  test('Screen 15 — Ready', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await setStatus(page, 'ready');

    await expect(page.locator('.record-eyebrow')).toHaveText('YOUR VOICE');
    await expect(page.locator('.record-title')).toHaveText(
      'Your voice is yours.'
    );
    await expect(page.locator('.record-subtitle')).toHaveText(
      'Ready to be kept.'
    );
    await expect(
      page.getByRole('button', { name: /^Continue$/ })
    ).toBeVisible();
  });
});

test.describe('Record flow — functional checks', () => {
  test('Entry → Grounding → Mic → Checklist → Env → Stage 1 advances', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['microphone']);
    await page.goto(DEV_ROUTE);

    await page.getByRole('button', { name: /^Begin$/ }).click();
    await expect(page.locator('.record-title')).toHaveText('This is for them.');

    await page.getByRole('button', { name: /I'm ready/i }).click();
    await expect(page.locator('.record-title')).toHaveText(
      'Your phone needs to hear you.'
    );

    await page.getByRole('button', { name: /Allow microphone/i }).click();
    await expect(page.locator('.record-title')).toHaveText('Before you begin.');

    await page.getByRole('button', { name: /^Begin$/ }).click();
    // Environment auto-advances, so just wait for Stage 1
    await expect(
      page.getByRole('button', { name: /Begin Stage 1/i })
    ).toBeVisible({ timeout: 6000 });
  });

  test('Pause link on Stage 2 intro routes to Paused', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await setClips(page, 5);

    await page.getByRole('button', { name: /Pause for now/i }).click();
    await expect(page.locator('.record-eyebrow')).toHaveText('PAUSED');
    await expect(page.locator('.record-title')).toHaveText(
      'Your voice is waiting.'
    );
    await expect(
      page.getByRole('button', { name: /Return home/i })
    ).toBeVisible();
  });
});
