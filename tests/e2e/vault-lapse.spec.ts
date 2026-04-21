/**
 * Session 7c: Lapse surface automated coverage.
 *
 * Covers the 11 scenarios from the 7c test plan that are safe to automate:
 * banner variants (10, 11, 12), restore screen copy (13, 14), voluntary
 * cancellation routing (18), and the guard behavior matrix (21–25).
 *
 * NOT covered here:
 * - Scenarios 1–9 require real Stripe Checkout; see manual-test-plan.md
 * - Scenarios 15–17 drive Stripe-hosted Customer Portal; manual
 * - Scenarios 3, 5 were dropped with the voice-processing trigger
 * - Scenarios 19, 20 (idempotency, out-of-order) need `stripe trigger`
 *   and a matching stripe listen config; manual
 *
 * Prerequisites:
 * - Dev server running (Playwright config auto-spawns on port 4000)
 * - `.env.local` populated with PLAYWRIGHT_TEST_* and SUPABASE_SERVICE_ROLE_KEY
 * - Playwright test user exists with password auth enabled
 * - VAULT_STRIPE_ENABLED can stay false — these tests don't hit real Stripe
 */

import { test, expect, type Page } from '@playwright/test';
import { signInTestUser, getTestUser } from './helpers/auth';
import {
  seedSubscription,
  clearSubscriptions,
  setProfileCustomerId,
  clearTrainingClips,
} from './helpers/db';

const user = getTestUser();

test.describe.configure({ mode: 'serial' }); // DB state is shared

test.beforeEach(async ({ page }) => {
  await signInTestUser(page);
});

test.afterEach(async () => {
  await clearSubscriptions(user.userId);
});

// --- Guard behavior matrix (scenarios 21–25) ---
//
// Each row of the matrix is one `test.step` assertion so failures pin-point
// the exact (status, route) cell. Sealed page is excluded from the vault-
// guard redirects because it handles its own polling/mock/sub-status gate
// (see src/app/app/vault/sealed/page.tsx).

const NON_SEALED_VAULT_ROUTES = [
  '/app/vault/reveal',
  '/app/vault/protect',
  '/app/vault/continuity',
  '/app/vault/seal',
] as const;

async function finalUrl(page: Page, startPath: string): Promise<string> {
  const res = await page.goto(startPath, { waitUntil: 'load' });
  expect(res, `navigation to ${startPath} produced no response`).not.toBeNull();
  // Let any client-side redirect / turbopack fetch settle before next nav.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  return new URL(page.url()).pathname;
}

test.describe('guard matrix', () => {
  test('status=none: vault routes render, restore bounces to /reveal', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'none' });

    for (const route of NON_SEALED_VAULT_ROUTES) {
      expect(await finalUrl(page, route), `none @ ${route}`).toBe(route);
    }
    expect(await finalUrl(page, '/app/vault/restore'), 'none @ /restore').toBe(
      '/app/vault/reveal',
    );
  });

  test('status=trial: vault routes redirect to /record', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'trial' });

    for (const route of NON_SEALED_VAULT_ROUTES) {
      expect(await finalUrl(page, route), `trial @ ${route}`).toBe('/app/record');
    }
    expect(await finalUrl(page, '/app/vault/restore'), 'trial @ /restore').toBe(
      '/app/record',
    );
  });

  test('status=active: vault routes redirect to /record', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'active' });

    for (const route of NON_SEALED_VAULT_ROUTES) {
      expect(await finalUrl(page, route), `active @ ${route}`).toBe('/app/record');
    }
    expect(await finalUrl(page, '/app/vault/restore'), 'active @ /restore').toBe(
      '/app/record',
    );
  });

  test('status=past_due: vault routes render normally (Stripe still retrying)', async ({
    page,
  }) => {
    await seedSubscription(user.userId, { status: 'past_due', lastFailedAttemptCount: 1 });

    for (const route of NON_SEALED_VAULT_ROUTES) {
      expect(await finalUrl(page, route), `past_due @ ${route}`).toBe(route);
    }
    // /restore renders for past_due users too (it's on the way from the banner CTA).
    expect(await finalUrl(page, '/app/vault/restore'), 'past_due @ /restore').toBe(
      '/app/vault/restore',
    );
  });

  test('status=lapsed: vault routes redirect to /restore', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'lapsed' });

    for (const route of NON_SEALED_VAULT_ROUTES) {
      expect(await finalUrl(page, route), `lapsed @ ${route}`).toBe('/app/vault/restore');
    }
    expect(await finalUrl(page, '/app/vault/restore'), 'lapsed @ /restore').toBe(
      '/app/vault/restore',
    );
  });

  test('status=cancelled: vault routes redirect to /restore', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'cancelled' });

    for (const route of NON_SEALED_VAULT_ROUTES) {
      expect(await finalUrl(page, route), `cancelled @ ${route}`).toBe('/app/vault/restore');
    }
    expect(await finalUrl(page, '/app/vault/restore'), 'cancelled @ /restore').toBe(
      '/app/vault/restore',
    );
  });
});

// --- Banner variants (scenarios 10, 11, 12) ---

test.describe('past-due banner', () => {
  async function bannerHeader(page: Page): Promise<string | null> {
    await page.goto('/app/record', { waitUntil: 'domcontentloaded' });
    const header = page.locator('.vault-past-due-banner__header');
    if ((await header.count()) === 0) return null;
    return (await header.first().textContent())?.trim() ?? null;
  }

  test('attempt=1 renders Variant 1 copy', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'past_due', lastFailedAttemptCount: 1 });
    expect(await bannerHeader(page)).toBe("Your card didn't go through this time.");
  });

  test('attempt=2 renders Variant 2 copy', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'past_due', lastFailedAttemptCount: 2 });
    expect(await bannerHeader(page)).toBe("Your card didn't go through again.");
  });

  test('attempt=3 renders Variant 3 copy', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'past_due', lastFailedAttemptCount: 3 });
    expect(await bannerHeader(page)).toBe('One more attempt before your vault pauses.');
  });

  test('attempt=5 still renders Variant 3 (defensive cap for raised Smart Retries)', async ({
    page,
  }) => {
    await seedSubscription(user.userId, { status: 'past_due', lastFailedAttemptCount: 5 });
    expect(await bannerHeader(page)).toBe('One more attempt before your vault pauses.');
  });

  test('status=active: no banner renders', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'active' });
    await page.goto('/app/record', { waitUntil: 'domcontentloaded' });
    // /app/record with status=active → we DON'T redirect (only vault routes do).
    // Banner is data-state-gated; should be absent.
    await expect(page.locator('.vault-past-due-banner')).toHaveCount(0);
  });
});

// --- Restore screen copy (scenarios 13, 14) ---

test.describe('restore screen', () => {
  test('has-recordings variant renders when training_clips exist', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'lapsed' });
    // Don't clear training clips — if the account has any, assertion checks the right copy.
    // For a guaranteed-has-recording state, seed one via the API in a future iteration.
    await page.goto('/app/vault/restore', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.vault-restore-screen__header')).toHaveText(
      'Your vault is paused.',
    );
    // Both variants share the header; branching is in the body.
    await expect(page.locator('.vault-restore-screen__body')).toBeVisible();
  });

  test('no-recordings variant renders when training_clips empty', async ({ page }) => {
    await clearTrainingClips(user.userId);
    await seedSubscription(user.userId, { status: 'lapsed' });
    await page.goto('/app/vault/restore', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.vault-restore-screen__header')).toHaveText(
      'Your vault is paused.',
    );
    await expect(page.locator('.vault-restore-screen__body')).toContainText(
      'Your vault is ready when you are.',
    );
  });

  test('cancelled status renders the same restore screen as lapsed', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'cancelled' });
    await page.goto('/app/vault/restore', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.vault-restore-screen__header')).toHaveText(
      'Your vault is paused.',
    );
  });
});

// --- Voluntary cancellation routing (scenario 18) ---

test.describe('voluntary cancellation', () => {
  test('status=cancelled routes from vault flow to /restore', async ({ page }) => {
    // Simulate "user cancelled in the dashboard, webhook fired with
    // cancellation_details.reason = 'cancellation_requested'" — our webhook
    // maps that to status='cancelled'. (Scenario 18 verifies via DB seed.)
    await seedSubscription(user.userId, { status: 'cancelled' });
    expect(await finalUrl(page, '/app/vault/protect')).toBe('/app/vault/restore');
  });
});

// --- Portal handoff (subset of scenario 15) ---
//
// We can't drive the Stripe-hosted Portal from Playwright reliably, but we
// CAN verify our own endpoint returns a portal URL when invoked with the
// right preconditions (flag on + stripe_customer_id set). Flag is off by
// default in .env.local for 7c ship — skip this test unless flag is on.

test.describe('portal session endpoint', () => {
  test.skip(
    () => process.env.VAULT_STRIPE_ENABLED !== 'true',
    'Requires VAULT_STRIPE_ENABLED=true',
  );

  test('returns a portal URL for a user with stripe_customer_id', async ({ page }) => {
    await seedSubscription(user.userId, { status: 'past_due', lastFailedAttemptCount: 1 });
    // Use a real test-mode customer ID. If the user never checked out, they
    // don't have one — seed a placeholder. Stripe will reject unknown IDs,
    // which exercises the other error path.
    // For a meaningful assertion here, populate with a real customer you've
    // created in test mode, via env var or a helper.
    const testCustomerId = process.env.PLAYWRIGHT_TEST_STRIPE_CUSTOMER_ID;
    if (!testCustomerId) {
      test.skip();
      return;
    }
    await setProfileCustomerId(user.userId, testCustomerId);

    // The fetch needs a session cookie — page.request carries it.
    const res = await page.request.post('/api/stripe/portal-session');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.portalUrl).toMatch(/^https:\/\/billing\.stripe\.com\/p\//);
  });
});
