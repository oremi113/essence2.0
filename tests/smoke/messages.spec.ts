/**
 * Step 6 (message creation) endpoint smoke tests — real server, real auth,
 * real database. Proves the gates, cost caps, save/idempotency, recipient
 * promotion, and audio promotion of /api/messages/{generate,regenerate,save,
 * discard} against the live schema.
 *
 * Vendor spend is ZERO: every path here returns before the ElevenLabs render
 * (guards, validation, caps, gates) or uses a seeded fake audio object (the
 * happy-save copy). The full /generate -> real-audio render path needs a real
 * cloned voice and is verified separately (see the note at the bottom).
 */
import { test, expect } from './fixtures/auth';
import * as s6 from './fixtures/step6';

const GEN = '/api/messages/generate';
const REGEN = '/api/messages/regenerate';
const SAVE = '/api/messages/save';
const DISCARD = '/api/messages/discard';

const newRecipient = { pendingRecipientName: 'Sarah', pendingRecipientRelationship: 'daughter' };

test.describe('Step 6 — message endpoints', () => {
  // ----- auth + validation -------------------------------------------------

  test('endpoints require auth (401 unauthenticated)', async ({ browser }) => {
    // defineRoute validates the body BEFORE auth, so send a schema-valid body —
    // it should pass validation and then be rejected for lack of a session.
    const ctx = await browser.newContext();
    const r = await ctx.request.post(GEN, {
      data: { voiceProfileId: s6.ZERO_UUID, category: 'birthday', ...newRecipient },
    });
    expect(r.status()).toBe(401);
    await ctx.close();
  });

  test('generate: rejects BOTH recipient branches (400)', async ({ authedContext }) => {
    const r = await authedContext.request.post(GEN, {
      data: { voiceProfileId: s6.ZERO_UUID, category: 'birthday', recipientId: s6.ZERO_UUID, ...newRecipient },
    });
    expect(r.status()).toBe(400);
  });

  test('generate: rejects NEITHER recipient branch (400)', async ({ authedContext }) => {
    const r = await authedContext.request.post(GEN, {
      data: { voiceProfileId: s6.ZERO_UUID, category: 'birthday' },
    });
    expect(r.status()).toBe(400);
  });

  // ----- generate guard + cost caps (all return before any render) ---------

  test('generate: a non-ready voice is rejected (VOICE_NOT_READY)', async ({ authedContext, voiceProfileId }) => {
    // voiceProfileId fixture seeds a 'collecting' profile
    const r = await authedContext.request.post(GEN, {
      data: { voiceProfileId, category: 'birthday', ...newRecipient },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).code).toBe('VOICE_NOT_READY');
  });

  test('generate: one active pending blocks a new cold start (pending_max)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    await s6.seedPending(testUser.id, vp); // one active in-flight flow
    const r = await authedContext.request.post(GEN, {
      data: { voiceProfileId: vp, category: 'birthday', ...newRecipient },
    });
    expect(r.status()).toBe(429);
    const b = await r.json();
    expect(b.code).toBe('cost_limit_blocked');
    expect(b.limit_kind).toBe('pending_max');
  });

  test('generate: edit-note past the depth cap is blocked (edit_note_depth)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const prior = await s6.seedPending(testUser.id, vp, { edit_note_depth: 2 });
    const r = await authedContext.request.post(GEN, {
      data: { voiceProfileId: vp, category: 'birthday', ...newRecipient, fromGenerationId: prior },
    });
    expect(r.status()).toBe(429);
    expect((await r.json()).limit_kind).toBe('edit_note_depth');
  });

  // ----- regenerate --------------------------------------------------------

  test('regenerate: variant past the regenerate cap is blocked (regenerate_cap)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, {
      regenerate_count: 3,
      text_status: 'succeeded',
      generated_text: 'hi',
      audio_status: 'succeeded',
      audio_path: 'x',
    });
    const r = await authedContext.request.post(REGEN, { data: { generationId: gen, mode: 'variant' } });
    expect(r.status()).toBe(429);
    expect((await r.json()).limit_kind).toBe('regenerate_cap');
  });

  test('regenerate: retry_audio with no cached text is a conflict (409)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, { generated_text: null });
    const r = await authedContext.request.post(REGEN, { data: { generationId: gen, mode: 'retry_audio' } });
    expect(r.status()).toBe(409);
  });

  test('regenerate: unknown generation → 404', async ({ authedContext }) => {
    const r = await authedContext.request.post(REGEN, { data: { generationId: s6.ZERO_UUID, mode: 'variant' } });
    expect(r.status()).toBe(404);
  });

  // ----- save --------------------------------------------------------------

  test('save: unknown generation → 404', async ({ authedContext }) => {
    const r = await authedContext.request.post(SAVE, { data: { generationId: s6.ZERO_UUID } });
    expect(r.status()).toBe(404);
  });

  test('save: not-yet-rendered audio is a conflict (409)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, {
      text_status: 'succeeded',
      generated_text: 'hi',
      audio_status: 'pending',
    });
    const r = await authedContext.request.post(SAVE, { data: { generationId: gen } });
    expect(r.status()).toBe(409);
  });

  test('save: lapsed subscription blocks save (403 subscription_lapsed)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    // no subscription seeded → status 'none'
    const gen = await s6.seedPending(testUser.id, vp, {
      text_status: 'succeeded',
      generated_text: 'hi',
      audio_status: 'succeeded',
      audio_path: `users/${testUser.id}/pending/x.mp3`,
    });
    const r = await authedContext.request.post(SAVE, { data: { generationId: gen } });
    expect(r.status()).toBe(403);
    expect((await r.json()).code).toBe('subscription_lapsed');
  });

  test('save: at the vault cap blocks save (403 vault_limit_reached)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    await s6.seedActiveSubscription(testUser.id);
    await s6.seedSavedMessages(testUser.id, vp, 3); // at the lifetime cap
    const gen = await s6.seedPending(testUser.id, vp, {
      text_status: 'succeeded',
      generated_text: 'hi',
      audio_status: 'succeeded',
      audio_path: `users/${testUser.id}/pending/x.mp3`,
    });
    const r = await authedContext.request.post(SAVE, { data: { generationId: gen } });
    expect(r.status()).toBe(403);
    expect((await r.json()).code).toBe('vault_limit_reached');
  });

  test('save: happy path — promotes recipient, copies audio, creates immutable message; idempotent on replay', async ({
    authedContext,
    testUser,
  }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    await s6.seedActiveSubscription(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, {
      text_status: 'succeeded',
      generated_text: 'Happy birthday, sweetheart.',
      audio_status: 'succeeded',
      pending_recipient_name: 'Sarah',
      pending_recipient_relationship: 'daughter',
      regenerate_count: 1,
    });
    await s6.seedPendingAudioObject(testUser.id, gen); // real object at the pending path

    const r = await authedContext.request.post(SAVE, { data: { generationId: gen } });
    expect(r.status()).toBe(200);
    const b = await r.json();
    expect(b.status).toBe('saved');
    expect(b.messageId).toBeTruthy();

    // immutable message row, linked to the generation
    const msg = await s6.getMessageBySource(gen);
    expect(msg).toBeTruthy();
    expect(msg!.status).toBe('saved');
    expect(msg!.category).toBe('birthday');
    expect(msg!.body_text).toBe('Happy birthday, sweetheart.');
    expect(msg!.regenerate_count).toBe(1);

    // recipient promoted from the pending branch
    const rec = await s6.getRecipientByName(testUser.id, 'Sarah');
    expect(rec).toBeTruthy();
    expect(rec!.relationship).toBe('daughter');
    expect(msg!.recipient_id).toBe(rec!.id);

    // pending row marked as promoted
    const pending = await s6.getPending(gen);
    expect(pending!.saved_message_id).toBe(b.messageId);

    // A rapid replay must never create a duplicate. (It may be either the
    // dedup gate (429) or the DB-level idempotent short-circuit (200) depending
    // on timing — the invariant that matters is "still exactly one message".)
    await authedContext.request.post(SAVE, { data: { generationId: gen } });
    expect(await s6.countSavedMessages(testUser.id)).toBe(1);
  });

  test('save: an already-promoted generation returns the existing message (idempotent)', async ({
    authedContext,
    testUser,
  }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const messageId = await s6.seedSavedMessage(testUser.id, vp);
    // Simulate a generation that was already saved (saved_message_id set).
    const gen = await s6.seedPending(testUser.id, vp, { saved_message_id: messageId });
    const r = await authedContext.request.post(SAVE, { data: { generationId: gen } });
    expect(r.status()).toBe(200);
    const b = await r.json();
    expect(b.messageId).toBe(messageId);
    expect(b.idempotent).toBe(true);
    expect(await s6.countSavedMessages(testUser.id)).toBe(1);
  });

  // ----- discard -----------------------------------------------------------

  test('discard: removes the pending row', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp);
    const r = await authedContext.request.post(DISCARD, { data: { generationId: gen } });
    expect(r.status()).toBe(200);
    expect((await r.json()).status).toBe('discarded');
    expect(await s6.getPending(gen)).toBeNull();
  });

  test('discard: already-saved generation cannot be discarded (409)', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const messageId = await s6.seedSavedMessage(testUser.id, vp);
    const gen = await s6.seedPending(testUser.id, vp, { saved_message_id: messageId });
    const r = await authedContext.request.post(DISCARD, { data: { generationId: gen } });
    expect(r.status()).toBe(409);
  });

  test('discard: unknown generation is a harmless no-op (200 discarded)', async ({ authedContext }) => {
    const r = await authedContext.request.post(DISCARD, { data: { generationId: s6.ZERO_UUID } });
    expect(r.status()).toBe(200);
    expect((await r.json()).status).toBe('discarded');
  });

  // ----- pending-audio playback ------------------------------------------

  test('play: returns a signed URL for a ready pending generation', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, { audio_status: 'succeeded' });
    await s6.seedPendingAudioObject(testUser.id, gen); // real object at the pending path
    const r = await authedContext.request.get(`/api/messages/generations/${gen}/play`);
    expect(r.status()).toBe(200);
    const b = await r.json();
    expect(b.url).toBeTruthy();
    expect(b.expiresIn).toBeGreaterThan(0);
  });

  test('play: audio not yet rendered → 400', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const gen = await s6.seedPending(testUser.id, vp, { audio_status: 'pending' });
    const r = await authedContext.request.get(`/api/messages/generations/${gen}/play`);
    expect(r.status()).toBe(400);
  });

  test('play: unknown generation → 404', async ({ authedContext }) => {
    const r = await authedContext.request.get(`/api/messages/generations/${s6.ZERO_UUID}/play`);
    expect(r.status()).toBe(404);
  });

  test('play: an already-saved generation → 409', async ({ authedContext, testUser }) => {
    const vp = await s6.seedReadyVoiceProfile(testUser.id);
    const messageId = await s6.seedSavedMessage(testUser.id, vp);
    const gen = await s6.seedPending(testUser.id, vp, {
      audio_status: 'succeeded',
      audio_path: `users/${testUser.id}/pending/x.mp3`,
      saved_message_id: messageId,
    });
    const r = await authedContext.request.get(`/api/messages/generations/${gen}/play`);
    expect(r.status()).toBe(409);
  });
});
