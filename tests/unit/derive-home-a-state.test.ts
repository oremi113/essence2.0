import { describe, it, expect } from 'vitest';
import { deriveHomeAState, type HomeAInput } from '@/app/home/deriveHomeAState';
import {
  VOICE_PROFILE_MAX_ATTEMPTS,
  VOICE_PROFILE_BACKOFF_MS,
} from '@/lib/voice-training/backoff';

/**
 * The /home state table (docs/session-home-a/home-a-critique.md §2.1).
 *
 * These exist because the two cases that matter most — the 25-clip hand-off
 * and the three failed sub-states — are the two hardest to reach by hand. The
 * hand-off needs a full script recorded; the sub-states need seeded
 * attempt_count and last_attempt_at. Logic that can only be checked by seeding
 * a database is logic that stops being checked.
 */
const base: HomeAInput = {
  voiceStatus: 'collecting',
  clipsRecorded: 12,
  subscriptionStatus: 'none',
  lastFailedAttemptCount: 0,
  attemptCount: null,
  lastAttemptAt: null,
};
const at = (o: Partial<HomeAInput>) => deriveHomeAState({ ...base, ...o });
const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

describe('register selection', () => {
  it('0 clips is not-started', () => {
    expect(at({ clipsRecorded: 0 })).toMatchObject({ register: 'not-started' });
  });
  it('1..24 clips is paused', () => {
    for (const c of [1, 5, 12, 17, 24]) {
      expect(at({ clipsRecorded: c })).toMatchObject({ register: 'paused', clipsRecorded: c });
    }
  });
});

describe('the hand-off to the build', () => {
  it('redirects at a full script rather than rendering "pick up where you left off"', () => {
    // The dead end this replaced: finish 25, reopen /home, and be told to
    // continue recording with nothing left to record.
    expect(at({ clipsRecorded: 25 })).toEqual({ kind: 'redirect', to: 'voice-processing' });
  });

  it('redirects while building', () => {
    for (const s of ['processing', 'queued']) {
      expect(at({ voiceStatus: s, clipsRecorded: 3 })).toEqual({
        kind: 'redirect', to: 'voice-processing',
      });
    }
  });

  it('sends a PAID 25-clip user to the same place, not to Card Capture', () => {
    // Card Capture bounces trial/active/past_due back to /home, so routing
    // there directly is a redirect loop. One target; its guard fans out.
    for (const sub of ['none', 'trial', 'active', 'past_due', 'lapsed']) {
      expect(at({ clipsRecorded: 25, subscriptionStatus: sub })).toEqual({
        kind: 'redirect', to: 'voice-processing',
      });
    }
  });
});

describe('failed sub-states', () => {
  it('is retryable when the window has passed', () => {
    expect(at({ voiceStatus: 'failed', clipsRecorded: 25, attemptCount: 1, lastAttemptAt: minsAgo(60) }))
      .toMatchObject({ register: 'failed', failedSubState: 'retryable' });
  });

  it('is waiting inside the window, and carries WHICH window', () => {
    const five = at({ voiceStatus: 'failed', clipsRecorded: 25, attemptCount: 1, lastAttemptAt: minsAgo(1) });
    expect(five).toMatchObject({ failedSubState: 'waiting', retryWindowMs: VOICE_PROFILE_BACKOFF_MS[1] });

    const thirty = at({ voiceStatus: 'failed', clipsRecorded: 25, attemptCount: 2, lastAttemptAt: minsAgo(1) });
    expect(thirty).toMatchObject({ failedSubState: 'waiting', retryWindowMs: VOICE_PROFILE_BACKOFF_MS[2] });
    // The copy names the window, so the two must not collapse into one.
    expect(five.kind === 'render' && five.retryWindowMs)
      .not.toBe(thirty.kind === 'render' && thirty.retryWindowMs);
  });

  it('gives waiting a deadline the screen can count down to', () => {
    const r = at({ voiceStatus: 'failed', clipsRecorded: 25, attemptCount: 1, lastAttemptAt: minsAgo(1) });
    expect(r.kind === 'render' && typeof r.retryAt).toBe('number');
  });

  it('is exhausted at the cap, whatever the clock says', () => {
    expect(at({
      voiceStatus: 'failed', clipsRecorded: 25,
      attemptCount: VOICE_PROFILE_MAX_ATTEMPTS, lastAttemptAt: minsAgo(9999),
    })).toMatchObject({ failedSubState: 'exhausted' });
  });

  it('does not redirect a failed profile away, even at 25 clips', () => {
    // failed is ALWAYS 25 clips — creation needs payment and a full script —
    // so the hand-off rule must not swallow the register.
    expect(at({ voiceStatus: 'failed', clipsRecorded: 25, attemptCount: 1, lastAttemptAt: minsAgo(60) }).kind)
      .toBe('render');
  });
});

describe('past-due variant', () => {
  it('is absent unless the subscription is past_due', () => {
    for (const s of ['none', 'trial', 'active', 'lapsed', 'cancelled']) {
      expect(at({ subscriptionStatus: s })).toMatchObject({ pastDueVariant: null });
    }
  });

  it('maps the attempt count to variants 1-3 and clamps both ends', () => {
    const v = (n: number) => {
      const r = at({ subscriptionStatus: 'past_due', lastFailedAttemptCount: n });
      return r.kind === 'render' ? r.pastDueVariant : null;
    };
    expect([v(0), v(1), v(2), v(3), v(9)]).toEqual([1, 1, 2, 3, 3]);
  });
});
