import { describe, expect, test } from 'vitest';
import {
  messageCreateSchema,
  audioInitUploadSchema,
  audioCommitSchema,
} from '@/lib/api/schemas';

describe('messageCreateSchema', () => {
  const valid = {
    voiceProfileId: 'vp_123',
    promptText: 'A short memory.',
  };

  test('accepts a minimal valid body', () => {
    const r = messageCreateSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.voiceProfileId).toBe('vp_123');
      expect(r.data.promptText).toBe('A short memory.');
    }
  });

  test('accepts optional title and recipientId', () => {
    const r = messageCreateSchema.safeParse({
      ...valid,
      title: 'A title',
      recipientId: 'rcp_1',
    });
    expect(r.success).toBe(true);
  });

  test('tolerates extra unknown fields (loose mode)', () => {
    const r = messageCreateSchema.safeParse({ ...valid, unknown: 42 });
    expect(r.success).toBe(true);
  });

  test('trims voiceProfileId whitespace', () => {
    const r = messageCreateSchema.safeParse({ ...valid, voiceProfileId: '  vp_trim  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voiceProfileId).toBe('vp_trim');
  });

  test('rejects missing voiceProfileId', () => {
    const r = messageCreateSchema.safeParse({ promptText: valid.promptText });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('voiceProfileId is required');
    }
  });

  test('rejects empty voiceProfileId', () => {
    const r = messageCreateSchema.safeParse({ ...valid, voiceProfileId: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('voiceProfileId is required');
    }
  });

  test('rejects whitespace-only voiceProfileId', () => {
    const r = messageCreateSchema.safeParse({ ...valid, voiceProfileId: '   ' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('voiceProfileId is required');
    }
  });

  test('rejects non-string voiceProfileId', () => {
    const r = messageCreateSchema.safeParse({ ...valid, voiceProfileId: 123 });
    expect(r.success).toBe(false);
  });

  test('rejects missing promptText', () => {
    const r = messageCreateSchema.safeParse({ voiceProfileId: valid.voiceProfileId });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('promptText is required');
    }
  });

  test('rejects whitespace-only promptText', () => {
    const r = messageCreateSchema.safeParse({ ...valid, promptText: '   \n\t  ' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('promptText is required');
    }
  });

  test('rejects promptText over 2000 characters', () => {
    const r = messageCreateSchema.safeParse({ ...valid, promptText: 'a'.repeat(2001) });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('promptText must be 2000 characters or fewer');
    }
  });

  test('accepts promptText at exactly 2000 characters', () => {
    const r = messageCreateSchema.safeParse({ ...valid, promptText: 'a'.repeat(2000) });
    expect(r.success).toBe(true);
  });

  test('rejects non-object body with "Invalid JSON body"', () => {
    expect(messageCreateSchema.safeParse(null).success).toBe(false);
    expect(messageCreateSchema.safeParse('string').success).toBe(false);
    expect(messageCreateSchema.safeParse(42).success).toBe(false);
    const r = messageCreateSchema.safeParse(null);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('Invalid JSON body');
    }
  });
});

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
