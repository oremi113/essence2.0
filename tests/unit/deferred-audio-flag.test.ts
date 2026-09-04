import { describe, it, expect, afterEach } from 'vitest';
import { isDeferredAudioEnabled } from '@/lib/messages/cost-controls';

/**
 * The default matters more than the flag. `/messages/new/g/[generationId]`
 * calls `notFound()` when this reads false, and the control arm's replacement
 * for that screen was never built — so an environment that simply doesn't set
 * the variable (every real deployment, historically) ran a full paid LLM +
 * ElevenLabs generation and then dropped the user on a 404.
 */
describe('isDeferredAudioEnabled', () => {
  const original = process.env.DEFERRED_AUDIO_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.DEFERRED_AUDIO_ENABLED;
    else process.env.DEFERRED_AUDIO_ENABLED = original;
  });

  it('is ON when the variable is unset — the only arm with a preview screen', () => {
    delete process.env.DEFERRED_AUDIO_ENABLED;
    expect(isDeferredAudioEnabled()).toBe(true);
  });

  it('is ON for an explicit "true"', () => {
    process.env.DEFERRED_AUDIO_ENABLED = 'true';
    expect(isDeferredAudioEnabled()).toBe(true);
  });

  it('is OFF only for an explicit "false" (the control-arm test escape hatch)', () => {
    process.env.DEFERRED_AUDIO_ENABLED = 'false';
    expect(isDeferredAudioEnabled()).toBe(false);
  });

  it('does not fall back to OFF on a typo', () => {
    process.env.DEFERRED_AUDIO_ENABLED = 'False';
    expect(isDeferredAudioEnabled()).toBe(true);
  });
});
