/**
 * Smoke tests for GET /api/training-clips/list against the real server + DB.
 * Covers the guardrails after migrating the route to defineRoute +
 * assertOwnsVoiceProfile: auth, the required-param 400, the ownership 404, and
 * the happy list. Zero vendor spend (no ElevenLabs/LLM in this path).
 */
import { test, expect } from './fixtures/auth';

const LIST = '/api/training-clips/list';
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('training-clips list', () => {
  test('unauthenticated → 401', async ({ browser }) => {
    const ctx = await browser.newContext();
    const r = await ctx.request.get(`${LIST}?voiceProfileId=${ZERO_UUID}`);
    expect(r.status()).toBe(401);
    await ctx.close();
  });

  test('missing voiceProfileId → 400', async ({ authedContext }) => {
    const r = await authedContext.request.get(LIST);
    expect(r.status()).toBe(400);
    // error envelope carries the convention shape now (defineRoute + AppError)
    expect((await r.json()).code).toBe('VALIDATION_ERROR');
  });

  test('unknown / not-owned profile → 404 voice_not_found', async ({ authedContext }) => {
    const r = await authedContext.request.get(`${LIST}?voiceProfileId=${ZERO_UUID}`);
    expect(r.status()).toBe(404);
    expect((await r.json()).code).toBe('VOICE_NOT_FOUND');
  });

  test("own profile → 200 with a clips array", async ({ authedContext, voiceProfileId }) => {
    const r = await authedContext.request.get(`${LIST}?voiceProfileId=${voiceProfileId}`);
    expect(r.status()).toBe(200);
    expect(Array.isArray(await r.json())).toBe(true);
  });
});
