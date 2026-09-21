import {
  isVoiceProfileRetryAllowed,
  VOICE_PROFILE_MAX_ATTEMPTS,
  VOICE_PROFILE_BACKOFF_MS,
} from '@/lib/voice-training/backoff';
import { TOTAL_PROMPT_COUNT } from '@/lib/voice-training/script';
import type {
  HomeARegister,
  HomeAFailedSubState,
  HomeAPastDueVariant,
} from '@/components/screens/home/HomeAScreen.types';

/**
 * Resolve what `/home` should do for a user whose voice is not `ready`.
 *
 * Pure on purpose. This is the table from docs/session-home-a/home-a-critique.md
 * §2.1, and it was previously written inline in the page, where the only way to
 * check it was to walk the app with seeded data — which meant the two cases
 * that matter most (the 25-clip hand-off and the three failed sub-states) were
 * the least likely to be exercised.
 */
export type HomeAState =
  | { kind: 'redirect'; to: 'voice-processing' }
  | {
      kind: 'render';
      register: HomeARegister;
      clipsRecorded: number;
      failedSubState?: HomeAFailedSubState;
      retryAt?: number;
      retryWindowMs?: number;
      pastDueVariant: HomeAPastDueVariant;
    };

export interface HomeAInput {
  voiceStatus: string;
  clipsRecorded: number;
  subscriptionStatus: string;
  lastFailedAttemptCount: number;
  attemptCount: number | null;
  lastAttemptAt: string | null;
}

export function deriveHomeAState(input: HomeAInput): HomeAState {
  const {
    voiceStatus, clipsRecorded, subscriptionStatus,
    lastFailedAttemptCount, attemptCount, lastAttemptAt,
  } = input;

  const pastDueVariant: HomeAPastDueVariant =
    subscriptionStatus === 'past_due'
      ? (Math.min(Math.max(lastFailedAttemptCount, 1), 3) as 1 | 2 | 3)
      : null;

  // The failed register comes BEFORE the hand-off, and the order is
  // load-bearing. `failed` always sits at 25 clips — creation needs payment and
  // a full script, so it is never a recording failure — so a hand-off that
  // tests the clip count first swallows the whole register and every one of its
  // sub-states becomes unreachable. Caught by a test; it would not have shown
  // up in a click-through, because a failed profile at 25 clips is exactly the
  // state that is hardest to reach by hand.
  if (voiceStatus === 'failed') {
    const attempts = attemptCount ?? 0;
    let failedSubState: HomeAFailedSubState;
    let retryAt: number | undefined;
    let retryWindowMs: number | undefined;

    if (attempts >= VOICE_PROFILE_MAX_ATTEMPTS) {
      failedSubState = 'exhausted';
    } else if (isVoiceProfileRetryAllowed(attempts, lastAttemptAt)) {
      failedSubState = 'retryable';
    } else {
      // Reaching here means a wait is in force, and isVoiceProfileRetryAllowed
      // returns true when lastAttemptAt is null — so it is necessarily set.
      failedSubState = 'waiting';
      retryWindowMs =
        VOICE_PROFILE_BACKOFF_MS[
          Math.min(attempts, VOICE_PROFILE_BACKOFF_MS.length - 1)
        ];
      retryAt = lastAttemptAt
        ? new Date(lastAttemptAt).getTime() + retryWindowMs
        : undefined;
    }
    return {
      kind: 'render', register: 'failed', clipsRecorded,
      failedSubState, retryAt, retryWindowMs, pastDueVariant,
    };
  }

  // Nothing left to record -> hand off to the build. Both "25 clips, not yet
  // building" and "already building" go to the SAME place: that page's guard
  // fans out correctly (none -> Card Capture, lapsed -> restore, paid ->
  // /start) and never returns here. Sending 25-clips-unpaid straight to Card
  // Capture is a redirect loop — protect/page.tsx bounces any
  // trial/active/past_due user back to /home.
  const building = voiceStatus === 'processing' || voiceStatus === 'queued';
  if (building || clipsRecorded >= TOTAL_PROMPT_COUNT) {
    return { kind: 'redirect', to: 'voice-processing' };
  }

  return {
    kind: 'render',
    register: clipsRecorded === 0 ? 'not-started' : 'paused',
    clipsRecorded,
    pastDueVariant,
  };
}
