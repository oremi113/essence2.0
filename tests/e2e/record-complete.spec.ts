import { test, expect } from '@playwright/test';

// Dev sandbox route bypasses auth + voice_profile guards, so we can exercise
// the UI sequence deterministically. The auth-gated route at
// /app/record/complete is tested separately below.
const DEV_ROUTE = '/dev/record-complete';

test.describe('First Breath Sequence — UI flow', () => {
  test('CTA gated until preserved phase, then reveals', async ({ page }) => {
    await page.goto(DEV_ROUTE);

    // t=0: no "See My Stone" CTA
    await expect(
      page.getByRole('button', { name: /see my stone/i })
    ).toHaveCount(0);

    // ~1s: Skip link surfaces
    await expect(page.getByRole('button', { name: /skip/i })).toBeVisible({
      timeout: 2000,
    });

    // ~5.5s: CTA reveals
    await expect(
      page.getByRole('button', { name: /see my stone/i })
    ).toBeVisible({ timeout: 7000 });
  });

  test('skip link jumps immediately to preserved phase', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await page.getByRole('button', { name: /skip/i }).click();
    await expect(
      page.getByRole('button', { name: /see my stone/i })
    ).toBeVisible();
  });

  test('reduced-motion: CTA visible immediately', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const reducedPage = await context.newPage();
    await reducedPage.goto(DEV_ROUTE);
    await expect(
      reducedPage.getByRole('button', { name: /see my stone/i })
    ).toBeVisible({ timeout: 2000 });
    await context.close();
  });

  test('full ceremonial flow routes to checkout stub', async ({ page }) => {
    await page.goto(DEV_ROUTE);
    await page.getByRole('button', { name: /skip/i }).click();
    await page.getByRole('button', { name: /see my stone/i }).click();

    // Detail phase — metadata chips present
    await expect(page.getByText(/recorded warmup/i)).toBeVisible();
    await expect(page.getByText(/emotion capture/i)).toBeVisible();
    await expect(page.getByText(/saved securely/i)).toBeVisible();

    await page.getByRole('button', { name: /^continue$/i }).click();

    // Validation phase — ceremonial copy
    await expect(page.getByText(/what you said matters/i)).toBeVisible();

    await page.getByRole('button', { name: /^continue$/i }).click();

    await expect(page).toHaveURL(/\/app\/record\/complete\/stub$/);
    await expect(page.getByText(/voice vault coming soon/i)).toBeVisible();
  });
});

test.describe('First Breath route — server guards', () => {
  test('unauthenticated user redirects to sign-in', async ({ page }) => {
    const response = await page.goto('/app/record/complete');
    await page.waitForURL(/\/auth\/sign-in/);
    expect(response).toBeTruthy();
    await expect(page).toHaveURL(/\/auth\/sign-in.*next=.*record.*complete/);
  });
});
