import { describe, expect, test } from 'vitest';
import {
  audioInitUploadSchema,
  audioCommitSchema,
} from '@/lib/api/schemas';

// (Tests for `messageCreateSchema` were removed with the legacy
// `POST /api/messages` create handler — FOLLOW_UPS #59.)

describe('audioInitUploadSchema', () => {
  const valid = {
    kind: 'training_clip',
    voiceProfileId: 'vp_1',
    promptId: 1,
  };

  test('accepts numeric promptId', () => {
    const r = audioInitUploadSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.promptIndex).toBe(1);
  });

  test('accepts string promptId that coerces to an integer', () => {
    const r = audioInitUploadSchema.safeParse({ ...valid, promptId: '3' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.promptIndex).toBe(3);
  });

  test('accepts prompt_index alias', () => {
    const r = audioInitUploadSchema.safeParse({
      kind: valid.kind,
      voiceProfileId: valid.voiceProfileId,
      prompt_index: 2,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.promptIndex).toBe(2);
  });

  test('prefers promptId when both are set', () => {
    const r = audioInitUploadSchema.safeParse({ ...valid, promptId: 5, prompt_index: 99 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.promptIndex).toBe(5);
  });

  test('defaults mime to audio/webm when missing', () => {
    const r = audioInitUploadSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.mime).toBe('audio/webm');
  });

  test('rejects promptId < 1', () => {
    const r = audioInitUploadSchema.safeParse({ ...valid, promptId: 0 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe(
        'promptId (prompt_index) required and must be >= 1',
      );
    }
  });

  test('rejects non-integer promptId', () => {
    const r = audioInitUploadSchema.safeParse({ ...valid, promptId: 1.5 });
    expect(r.success).toBe(false);
  });

  test('rejects promptId that cannot coerce to a number', () => {
    const r = audioInitUploadSchema.safeParse({ ...valid, promptId: 'not-a-number' });
    expect(r.success).toBe(false);
  });

  test('rejects missing promptId and prompt_index', () => {
    const r = audioInitUploadSchema.safeParse({
      kind: valid.kind,
      voiceProfileId: valid.voiceProfileId,
    });
    expect(r.success).toBe(false);
  });

  test('rejects wrong kind literal', () => {
    const r = audioInitUploadSchema.safeParse({ ...valid, kind: 'other' });
    expect(r.success).toBe(false);
  });

  test('rejects missing voiceProfileId', () => {
    const r = audioInitUploadSchema.safeParse({
      kind: valid.kind,
      promptId: valid.promptId,
    });
    expect(r.success).toBe(false);
  });

  test('normalizes resolvedVariantKeys: object passes through', () => {
    const r = audioInitUploadSchema.safeParse({
      ...valid,
      resolvedVariantKeys: { city: 'nyc' },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.resolvedVariantKeys).toEqual({ city: 'nyc' });
  });

  test('normalizes resolvedVariantKeys: non-object coerces to null', () => {
    const r = audioInitUploadSchema.safeParse({
      ...valid,
      resolvedVariantKeys: 'not an object',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.resolvedVariantKeys).toBeNull();
  });
});

describe('audioCommitSchema', () => {
  const valid = { kind: 'training_clip' as const, id: 'clip_1' };

  test('accepts string id', () => {
    expect(audioCommitSchema.safeParse(valid).success).toBe(true);
  });

  test('accepts numeric id', () => {
    expect(audioCommitSchema.safeParse({ ...valid, id: 42 }).success).toBe(true);
  });

  test('rejects falsy id (empty string)', () => {
    const r = audioCommitSchema.safeParse({ ...valid, id: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('id required');
  });

  test('rejects falsy id (zero)', () => {
    const r = audioCommitSchema.safeParse({ ...valid, id: 0 });
    expect(r.success).toBe(false);
  });

  test('rejects missing id', () => {
    const r = audioCommitSchema.safeParse({ kind: valid.kind });
    expect(r.success).toBe(false);
  });

  test('rejects wrong kind literal', () => {
    const r = audioCommitSchema.safeParse({ ...valid, kind: 'other' });
    expect(r.success).toBe(false);
  });
});
