'use client';

/**
 * A5 — Generation. The "shaping your message" wait between A4 and A6.
 *
 * Production implementation of prototypes/message creation/
 * essence-step6-a5.html. Pure and props-driven per CLAUDE.md: the screen
 * owns the working copy-beat progression and all motion; retry and
 * adjust-note bubble out (the page owns /generate and navigation). See
 * GenerationScreen.types.ts for the contract.
 *
 * Two stages:
 *   Working — stone in `working` tone, three calm copy beats that
 *     progress on a timer if generation is still in flight:
 *       1. "Shaping your message."        (0–4s)
 *       2. "Listening for the right tone." (4–9s)
 *       3. "Almost there."                 (9s+)
 *     No bar, no percentage, no countdown (inventory §A5).
 *   Failed — a smaller stone that reverts to the warm `ready` tone,
 *     content shifted higher into task mode, and a single warm retry.
 *     The note path keeps a "Your note is kept" reassurance and an
 *     "Adjust your note" fallback; the skip path shows the retry alone.
 *
 * No backbar: generation is in flight and can't be backed out of without
 * losing the request (prototype note). Success is modelled by unmount —
 * the parent navigates to A6 while the stone is still breathing.
 */

import { useEffect, useState } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import type { GenerationScreenProps } from './GenerationScreen.types';
import { GENERATION_CSS } from './GenerationScreen.css';

/** Copy beats — the only words on the working stage. */
const COPY_BEATS = {
  1: { title: 'Shaping your message.', aside: 'A minute, no more.' },
  2: { title: 'Listening for the right tone.', aside: 'Choosing the words that fit.' },
  3: { title: 'Almost in your voice.', aside: 'The right words take a moment.' },
} as const;

type Beat = keyof typeof COPY_BEATS;

/**
 * Beat 1 → 2 at 5s, 2 → 3 at 10s. Pushed back from 4s/9s so beat 1 gets
 * real settled dwell *after* the ~1.5s entrance (it was being eaten);
 * beat 3 is the terminal hold until generation returns.
 */
const BEAT_2_AT_MS = 5000;
const BEAT_3_AT_MS = 10000;
/** Cross-fade duration when a beat swaps (matches the prototype's 400ms). */
const BEAT_FADE_MS = 400;

const FAILED_COPY = {
  // Attempts 1–2: a single warm retry. "Something slipped on our end" keeps the
  // blame off the user; "Your note is kept" is the reassure-what's-safe beat.
  retry: {
    title: 'Couldn’t quite land it.',
    withNote: {
      aside: 'Something slipped on our end.',
      reassurance: 'Your note is kept.',
    },
    skip: {
      aside: 'Something slipped on our end. Nothing is lost.',
      reassurance: null,
    },
    primary: 'Try again',
    secondary: 'Adjust your note',
  },
  // The 3-attempt ceiling (§12.4): stop looping, offer contact-as-care. Warm,
  // owns the fault ("that’s on us"), keeps a quiet "Try once more" so it is
  // never a dead end.
  exhausted: {
    title: 'Couldn’t quite land it.',
    withNote: {
      aside: 'This one’s proving stubborn, and that’s on us.',
      reassurance: 'Your note is kept.',
    },
    skip: {
      aside: 'This one’s proving stubborn, and that’s on us. Nothing is lost.',
      reassurance: null,
    },
    primary: 'Reach us and we’ll shape it with you',
    secondary: 'Try once more',
  },
} as const;

/** Working stone breathes large + cool; failed stone shrinks + warms. */
const STONE_WORKING = 180;
const STONE_FAILED = 160;

export function GenerationScreen({
  recipientName,
  categoryLabel,
  status = 'working',
  hasNote = false,
  onRetry,
  onAdjustNote,
  retriesExhausted = false,
  onContactSupport,
}: GenerationScreenProps) {
  const reducedMotion = useReducedMotion();

  // The beat whose copy is shown. `fading` dims it to 0.3 mid-swap so the
  // text changes behind a brief cross-fade rather than a hard cut.
  const [displayBeat, setDisplayBeat] = useState<Beat>(1);
  const [fading, setFading] = useState(false);

  // Re-entering "working" (a parent flipping failed → working on retry,
  // without remounting) resets the progression to beat 1. Adjusted during
  // render — React's endorsed pattern for "reset state on prop change" —
  // so the timer effect below stays free of synchronous setState.
  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (status === 'working') {
      setDisplayBeat(1);
      setFading(false);
    }
  }

  // Arm the beat progression while working. Timers re-arm from zero on
  // (re)entering "working"; each beat swap dims, swaps, undims.
  useEffect(() => {
    if (status !== 'working') return;
    const pending: ReturnType<typeof setTimeout>[] = [];

    const advance = (next: Beat) => {
      setFading(true);
      pending.push(
        setTimeout(
          () => {
            setDisplayBeat(next);
            setFading(false);
          },
          reducedMotion ? 0 : BEAT_FADE_MS,
        ),
      );
    };

    pending.push(setTimeout(() => advance(2), BEAT_2_AT_MS));
    pending.push(setTimeout(() => advance(3), BEAT_3_AT_MS));

    return () => pending.forEach(clearTimeout);
  }, [status, reducedMotion]);

  if (status === 'failed') {
    // Past the 3-attempt ceiling, swap the endless-retry primary for
    // contact-as-care. Falls back to the retry treatment if no support handler
    // was wired (so the screen never dead-ends on a missing callback).
    const exhausted = retriesExhausted && Boolean(onContactSupport);
    const level = exhausted ? FAILED_COPY.exhausted : FAILED_COPY.retry;
    const copy = hasNote ? level.withNote : level.skip;
    // Retry mode: an "Adjust your note" fallback on the note path.
    // Exhausted mode: a quiet "Try once more" so help is offered, not forced.
    const showSecondary = exhausted || (hasNote && Boolean(onAdjustNote));
    return (
      <div className="gen gen--failed">
        <style>{GENERATION_CSS}</style>
        <Crumb recipientName={recipientName} categoryLabel={categoryLabel} />

        <div className="gen__stage gen__stage--failed">
          <div className="gen__stone-wrap" aria-hidden="true">
            <BreathStone state="ready" size={STONE_FAILED} reducedMotion={reducedMotion} />
          </div>
          <div role="alert">
            <h1 className="gen__failed-title">{level.title}</h1>
            <p className="gen__failed-aside">{copy.aside}</p>
          </div>
          {copy.reassurance ? (
            <p className="gen__failed-reassurance">{copy.reassurance}</p>
          ) : null}
          <div className="gen__actions">
            <button
              type="button"
              className="gen__btn"
              onClick={exhausted ? onContactSupport : onRetry}
            >
              {level.primary}
            </button>
            {showSecondary ? (
              <button
                type="button"
                className="gen__btn gen__btn--link"
                onClick={exhausted ? onRetry : onAdjustNote}
              >
                {level.secondary}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const beat = COPY_BEATS[displayBeat];
  return (
    <div className="gen">
      <style>{GENERATION_CSS}</style>
      <Crumb recipientName={recipientName} categoryLabel={categoryLabel} />

      <div className="gen__stage" aria-busy="true">
        <div className="gen__stone-wrap" aria-hidden="true">
          <BreathStone state="working" size={STONE_WORKING} reducedMotion={reducedMotion} />
        </div>
        {/* One quiet status announcement for the whole wait — not aria-live
            on the title, which would re-announce every beat swap (every
            ~5s). The visible beats are decorative reassurance. */}
        <p className="sr-only" role="status">
          Creating your message.
        </p>
        <div aria-hidden="true">
          <h1 className={`gen__title${fading ? ' is-fading' : ''}`}>{beat.title}</h1>
          <p className={`gen__aside${fading ? ' is-fading' : ''}`}>{beat.aside}</p>
        </div>
      </div>
    </div>
  );
}

function Crumb({
  recipientName,
  categoryLabel,
}: {
  recipientName: string;
  categoryLabel: string;
}) {
  return (
    <div className="gen__crumb-row">
      <div className="gen__crumb">
        <span>For {recipientName}</span>
        <span className="gen__crumb-divider" aria-hidden="true" />
        <span>{categoryLabel}</span>
      </div>
    </div>
  );
}
