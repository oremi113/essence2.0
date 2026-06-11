/**
 * Deferred-Audio (Amendment A1) endpoint smoke tests — real server + real DB.
 *
 * These exercise the FLAG-ON behavior, so they only run when the server (and
 * this test process) have DEFERRED_AUDIO_ENABLED=true. In a default smoke run
 * the whole describe is skipped. Invoke with:
 *
 *   DEFERRED_AUDIO_ENABLED=true npm run test:smoke -- tests/smoke/messages-deferred.spec.ts
 *
 * Zero vendor spend: regenerate's deferred path is text-only (and these seed a
 * note-less row → pure-template, no LLM call), and the /commit tests all return
 * before the render. The commit render+promote happy path needs a real cloned
 * voice, so it's a separate manual check (same boundary as /generate's render).
 */
import { test, expect } from './fixtures/auth';
import * as s6 from './fixtures/step6';

const REGEN = '/api/messages/regenerate';
const COMMIT = '/api/messages/commit';

test.describe('Step 6 — Deferred Audio (flag on)', () => {
  test.skip(process.env.DEFERRED_AUDIO_ENABLED !== 'true', 'requires DEFERRED_AUDIO_ENABLED=true');

  test('regenerate (variant) produces a free text candidate without touching the committed take', async ({
    authedContext,
    testUser,
  }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    // A committed take the user has already heard.
    const gen = await s6.seedPending(testUser.id, vp, {
      generated_text: 'Committed take the user heard.',
      audio_status: 'succeeded',
      audio_path: `users/${testUser.id}/pending/${'x'}.mp3`,
      note: null, // pure-template → no LLM spend
      text_reroll_count: 0,
      audio_render_count: 1,
    });

    const r = await authedContext.request.post(REGEN, { data: { generationId: gen, mode: 'variant' } });
    expect(r.status()).toBe(200);
    const b = await r.json();
    expect(b.candidate).toBe(true);
    expect(b.textRerollCount).toBe(1);
    // The response carries the new draft's words so the UI can render it (#2).
    expect(b.candidateText).toBeTruthy();

    const row = await s6.getPending(gen);
    // A candidate now exists...
    expect(row!.candidate_text).toBeTruthy();
    expect(b.candidateText).toBe(row!.candidate_text); // response matches what was persisted
    expect(row!.candidate_template_variant).toBeTruthy();
    expect(row!.text_reroll_count).toBe(1);
    // ...and the committed take is untouched (no render happened).
    expect(row!.generated_text).toBe('Committed take the user heard.');
    expect(row!.audio_status).toBe('succeeded');
    expect(row!.audio_render_count).toBe(1);
  });

  test('regenerate (variant) past the text-reroll soft cap is blocked (text_reroll_cap)', async ({
    authedContext,
    testUser,
  }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, {
      note: null,
      text_reroll_count: 10, // at the cap
      generated_text: 'committed',
      audio_status: 'succeeded',
    });
    const r = await authedContext.request.post(REGEN, { data: { generationId: gen, mode: 'variant' } });
    expect(r.status()).toBe(429);
    const b = await r.json();
    expect(b.code).toBe('cost_limit_blocked');
    expect(b.limit_kind).toBe('text_reroll_cap');
  });

  test('commit with no candidate on screen is a conflict (409)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, { candidate_text: null });
    const r = await authedContext.request.post(COMMIT, { data: { generationId: gen } });
    expect(r.status()).toBe(409);
  });

  test('commit past the audio-render cap is blocked (audio_render_cap)', async ({
    authedContext,
    testUser,
  }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, {
      candidate_text: 'a candidate take',
      candidate_template_variant: 'birthday_generic_01',
      audio_render_count: 3, // at the cap — blocks before any render
    });
    const r = await authedContext.request.post(COMMIT, { data: { generationId: gen } });
    expect(r.status()).toBe(429);
    const b = await r.json();
    expect(b.limit_kind).toBe('audio_render_cap');
  });

  test('commit on an unknown generation → 404', async ({ authedContext }) => {
    const r = await authedContext.request.post(COMMIT, { data: { generationId: s6.ZERO_UUID } });
    expect(r.status()).toBe(404);
  });
});
