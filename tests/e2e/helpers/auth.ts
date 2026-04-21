/**
 * Playwright auth helper. The app uses magic-link sign-in for real users;
 * tests bypass that by signing in the dedicated playwright@essence-test.local
 * account via password auth. Credentials in .env.local as
 * PLAYWRIGHT_TEST_{EMAIL,PASSWORD,USER_ID}.
 *
 * Signs in by navigating to a dev-only bootstrap page that runs the
 * Supabase browser client's signInWithPassword. That ensures the auth
 * cookie is written in the exact format @supabase/ssr expects (including
 * the `base64-` prefix used in 0.8+), rather than us hand-crafting it.
 *
 * The account has user_metadata.playwright_test = true so it's filterable.
 * Password auth is programmatic-only — the app has no password sign-in UI.
 */

import type { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  userId: string;
}

export function getTestUser(): TestUser {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  const userId = process.env.PLAYWRIGHT_TEST_USER_ID;
  if (!email || !password || !userId) {
    throw new Error(
      'Missing PLAYWRIGHT_TEST_{EMAIL,PASSWORD,USER_ID}. Populate .env.local first.',
    );
  }
  return { email, password, userId };
}

/**
 * Sign the test user in via Supabase password auth. Uses the dev-only
 * bootstrap page at /dev/test-auth which invokes createBrowserClient and
 * signInWithPassword so the SSR cookie lands in the right shape.
 *
 * Safe to call at the start of every test — idempotent per browser context.
 */
export async function signInTestUser(page: Page, user: TestUser = getTestUser()): Promise<void> {
  await page.goto(
    `/dev/test-auth?email=${encodeURIComponent(user.email)}&password=${encodeURIComponent(user.password)}`,
    { waitUntil: 'domcontentloaded' },
  );
  // Wait for the bootstrap page to transition out of its "working" state.
  // The result text flips to 'ok' after signInWithPassword resolves.
  const locator = page.locator('[data-testid="test-auth-result"]');
  await locator.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="test-auth-result"]');
      const text = el?.textContent?.trim();
      return text && text !== 'working';
    },
    undefined,
    { timeout: 10_000 },
  );
  const result = (await locator.textContent())?.trim();
  if (result !== 'ok') {
    throw new Error(`Test auth bootstrap failed: ${result}`);
  }
}
