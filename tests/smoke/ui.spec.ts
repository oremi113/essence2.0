/**
 * UI smoke tests. Use Chromium's fake media device (configured via
 * launch flags in playwright.config.ts) to feed a real WAV into the
 * MediaRecorder pipeline without needing a real microphone.
 */
import { test, expect } from './fixtures/auth';
import { adminClient } from './fixtures/supabase';

test.describe('voice prompts UI', () => {
  test('record + upload: one full prompt via MediaRecorder', async ({
    authedContext,
    voiceProfileId,
  }) => {
    const page = await authedContext.newPage();
    // voiceProfileId is seeded via fixture; /app/record reads it server-side
    void voiceProfileId;
    // Inject a 2s delay into the commit call so we can reliably observe the
    // "Saving…" intermediate state between stop-click and upload completion.
    await page.route('**/api/audio/commit', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto('/app/record');

    // Walk the pre-record setup views
    await page.getByRole('button', { name: /begin voice training/i }).click();
    await page.getByRole('button', { name: /i'?m ready/i }).click();
    await page.getByRole('button', { name: /allow microphone/i }).click();
    await page.getByRole('button', { name: /^begin$/i }).click();
    await page.getByRole('button', { name: /begin stage 1/i }).click();

    // Prompt 1: start recording, capture ~3s of audio, then stop and wait
    // for the commit round-trip — NOT just the "Saved" label, which only
    // reflects stop-click, not upload completion.
    const recordButton = page.locator('.record-button');
    await expect(recordButton).toBeVisible();
    await recordButton.click();
    await expect(page.locator('.record-label--recording')).toBeVisible();
    await page.waitForTimeout(3000);

    const commitResponse = page.waitForResponse(
      (r) => r.url().includes('/api/audio/commit') && r.request().method() === 'POST',
      { timeout: 45_000 }
    );
    await recordButton.click();
    // Label should enter the intermediate "Saving…" state while commit is
    // in flight (guaranteed by the 2s route delay above).
    await expect(page.locator('.record-label--saving')).toBeVisible();
    await expect(page.getByText(/saving…/i)).toBeVisible();
    const commit = await commitResponse;
    expect(commit.status()).toBe(200);
    const commitBody = await commit.json();
    expect(commitBody.status).toBe('uploaded');
    expect(commitBody.byteSize).toBeGreaterThanOrEqual(5 * 1024);
    // After commit, label flips to "Saved"
    await expect(page.locator('.record-label--saved')).toBeVisible({ timeout: 5000 });

    // DB reflects the upload
    const { data: clips } = await adminClient()
      .from('training_clips')
      .select('id, prompt_index, status, bytes')
      .eq('voice_profile_id', voiceProfileId)
      .eq('status', 'uploaded');
    expect(clips?.length).toBe(1);
    expect(clips?.[0].prompt_index).toBe(1);
  });

  test('mic permission denied: shows guidance, does not advance', async ({
    browser,
    testUser,
    voiceProfileId,
  }) => {
    const context = await browser.newContext();
    const { signInContext } = await import('./fixtures/auth');
    const { ENV } = await import('./fixtures/env');
    await signInContext(context, testUser);

    const page = await context.newPage();
    // Override getUserMedia to throw NotAllowedError — simulates browser
    // denial without needing to actually revoke the fake-media flags.
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: () =>
          Promise.reject(
            Object.assign(new Error('denied'), { name: 'NotAllowedError' })
          ),
      });
    });
    void voiceProfileId;
    await page.goto(`${ENV.BASE_URL}/app/record`);

    await page.getByRole('button', { name: /begin voice training/i }).click();
    await page.getByRole('button', { name: /i'?m ready/i }).click();
    await page.getByRole('button', { name: /allow microphone/i }).click();

    // Error copy should appear; we should NOT have advanced to the checklist
    await expect(page.getByText(/microphone access was blocked/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^begin$/i })).toHaveCount(0);

    await context.close();
  });
});
