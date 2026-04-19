/* eslint-disable react-hooks/rules-of-hooks -- `use` here is the Playwright fixture callback, not React's hook. */
import { test as base, expect, type BrowserContext, type APIRequestContext } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  generateAuthLinkHash,
  seedVoiceProfile,
  type TestUser,
} from './supabase';
import { ENV } from './env';

/**
 * Sign the browser context in by hitting /auth/callback with a magic-link
 * token_hash. On success, Supabase SSR cookies get written and subsequent
 * navigations/requests are authenticated.
 */
export async function signInContext(context: BrowserContext, user: TestUser): Promise<void> {
  const hashedToken = await generateAuthLinkHash(user.email);
  const url = `${ENV.BASE_URL}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=/home`;
  const page = await context.newPage();
  const resp = await page.goto(url, { waitUntil: 'load' });
  expect(resp?.ok() || resp?.status() === 302).toBeTruthy();
  // Confirm we landed authenticated (not bounced back to /auth/sign-in)
  await expect(page).not.toHaveURL(/\/auth\/sign-in/);
  await page.close();
}

/**
 * Issue an authenticated APIRequestContext for hitting Next API routes.
 * Reuses the BrowserContext's cookies so it inherits the Supabase session.
 */
export async function authedRequest(context: BrowserContext): Promise<APIRequestContext> {
  return context.request;
}

type SmokeFixtures = {
  testUser: TestUser;
  authedContext: BrowserContext;
  voiceProfileId: string;
};

/**
 * Primary fixture: fresh user + auth'd browser context + a seeded
 * 'collecting' voice profile. Cleaned up after each test.
 */
export const test = base.extend<SmokeFixtures>({
  testUser: async ({}, use) => {
    const user = await createTestUser();
    await use(user);
    await deleteTestUser(user.id);
  },
  authedContext: async ({ browser, testUser }, use) => {
    const context = await browser.newContext({
      permissions: ['microphone'],
    });
    await signInContext(context, testUser);
    await use(context);
    await context.close();
  },
  voiceProfileId: async ({ testUser }, use) => {
    const { voiceProfileId } = await seedVoiceProfile(testUser.id);
    await use(voiceProfileId);
  },
});

export { expect };
