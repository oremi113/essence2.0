/**
 * API-level smoke tests. No MediaRecorder needed — drive the /api/audio/*
 * and /api/voice-profiles/* routes directly through an authenticated
 * BrowserContext and assert gate behavior.
 */
import { test, expect } from './fixtures/auth';
import { seedClipRows, uploadToStorage, getTrainingClip } from './fixtures/supabase';

test.describe('voice prompts API gates', () => {
  test('sequential enforcement: prompt 5 before 1..4 is rejected', async ({
    authedContext,
    voiceProfileId,
  }) => {
    const resp = await authedContext.request.post('/api/audio/init-upload', {
      data: {
        kind: 'training_clip',
        voiceProfileId,
        promptId: 5,
        mime: 'audio/webm',
      },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('PROMPT_OUT_OF_ORDER');
    expect(body.expectedNext).toBe(1);
  });

  test('prompt out of range (>25) is rejected', async ({
    authedContext,
    voiceProfileId,
  }) => {
    const resp = await authedContext.request.post('/api/audio/init-upload', {
      data: {
        kind: 'training_clip',
        voiceProfileId,
        promptId: 26,
        mime: 'audio/webm',
      },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('PROMPT_OUT_OF_RANGE');
  });

  test('tiny clip (<5KB) is rejected at commit', async ({
    authedContext,
    voiceProfileId,
  }) => {
    // 1) init-upload for prompt 1
    const init = await authedContext.request.post('/api/audio/init-upload', {
      data: {
        kind: 'training_clip',
        voiceProfileId,
        promptId: 1,
        mime: 'audio/webm',
      },
    });
    expect(init.status()).toBe(200);
    const { id, signedUploadUrl, requiredHeaders } = await init.json();

    // 2) PUT a 3KB blob (below the 5KB minimum)
    const tiny = Buffer.alloc(3 * 1024, 0x42);
    const put = await authedContext.request.fetch(signedUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': requiredHeaders['Content-Type'] },
      data: tiny,
    });
    expect(put.ok()).toBeTruthy();

    // 3) commit should reject
    const commit = await authedContext.request.post('/api/audio/commit', {
      data: { kind: 'training_clip', id },
    });
    expect(commit.status()).toBe(400);
    const body = await commit.json();
    expect(body.error).toMatch(/too small/i);

    // DB row should still be 'uploading', not 'uploaded'
    const clip = await getTrainingClip(id);
    expect(clip.status).toBe('uploading');
  });

  test('valid clip (>=5KB) commits successfully', async ({
    authedContext,
    voiceProfileId,
  }) => {
    const init = await authedContext.request.post('/api/audio/init-upload', {
      data: {
        kind: 'training_clip',
        voiceProfileId,
        promptId: 1,
        mime: 'audio/webm',
      },
    });
    expect(init.status()).toBe(200);
    const { id, signedUploadUrl, requiredHeaders } = await init.json();

    const valid = Buffer.alloc(10 * 1024, 0xa7);
    const put = await authedContext.request.fetch(signedUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': requiredHeaders['Content-Type'] },
      data: valid,
    });
    expect(put.ok()).toBeTruthy();

    const commit = await authedContext.request.post('/api/audio/commit', {
      data: { kind: 'training_clip', id },
    });
    expect(commit.status()).toBe(200);
    const body = await commit.json();
    expect(body.status).toBe('uploaded');
    expect(body.byteSize).toBe(10 * 1024);
  });

  test('voice creation: insufficient clips (<10) is rejected', async ({
    authedContext,
    testUser,
    voiceProfileId,
  }) => {
    // Seed only 9 uploaded clips — one short of MIN_CLIP_COUNT
    await seedClipRows(testUser.id, voiceProfileId, 9, 20 * 1024);
    const resp = await authedContext.request.post(
      `/api/voice-profiles/${voiceProfileId}/start`
    );
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.code).toBe('INSUFFICIENT_CLIPS');
    expect(body.required).toBe(10);
    expect(body.actual).toBe(9);
  });

  test('voice creation: clips too short (<100KB total) is rejected', async ({
    authedContext,
    testUser,
    voiceProfileId,
  }) => {
    // 10 clips × 500 bytes = 5KB total, below the 100KB minimum
    await seedClipRows(testUser.id, voiceProfileId, 10, 500);
    const resp = await authedContext.request.post(
      `/api/voice-profiles/${voiceProfileId}/start`
    );
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.code).toBe('CLIPS_TOO_SHORT');
  });
});
