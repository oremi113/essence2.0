'use client';

/**
 * Home A — Direction 2, "Threshold" (docs/session-home-a/design-directions.md).
 *
 * Design position: progress is not the point; coming back is. The hero is a
 * typographic invitation, left-aligned and editorial, and the count is demoted
 * to a single line of prose. The premise is that a user who paused mid-journey
 * needs a low-friction door back in, not a scoreboard telling them how far
 * behind they are.
 *
 * Pure and props-driven per CLAUDE.md — no Supabase, no redirect, no server
 * actions. The stone is the shared canvas BreathStone (FOLLOW_UPS #35) at the
 * handoff's pinned states: `idle` collecting, `working` building.
 */

import { useEffect, useState } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { TOTAL_PROMPT_COUNT } from '@/lib/voice-training/script';
import {
  type HomeAScreenProps,
  capitalize,
  numberWord,
  stageForCount,
} from './HomeAScreen.types';
import { HOME_A_THRESHOLD_CSS } from './HomeAScreen.threshold.css';

const STONE_SIZE = 96;

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * What's waiting, in the script's own terms. Three strings for the three real
 * stages — enough to make returning concrete without writing (and maintaining)
 * a hint for all 25 prompts. Invitational, never a reminder of what's owed.
 */
const AHEAD_LINE: Record<1 | 2 | 3, string> = {
  1: 'What’s next is easy. Warm hellos, nothing heavy yet.',
  2: 'The ones ahead ask for more feeling. Take them slowly, one at a time.',
  3: 'The ones left are the short ones. You’re close to the end of the talking.',
};

export function HomeAScreenThreshold({
  isProcessing,
  clipsRecorded,
  onContinue,
  onSettings,
  footer,
  reducedMotionOverride,
}: HomeAScreenProps) {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;

  const [ground, setGround] = useState<'warm' | 'neutral'>(
    reducedMotion ? 'neutral' : 'warm',
  );
  useEffect(() => {
    if (reducedMotion || ground === 'neutral') return;
    const id = requestAnimationFrame(() => setGround('neutral'));
    return () => cancelAnimationFrame(id);
  }, [reducedMotion, ground]);

  const done = isProcessing
    ? TOTAL_PROMPT_COUNT
    : Math.max(0, Math.min(clipsRecorded, TOTAL_PROMPT_COUNT));
  const remaining = TOTAL_PROMPT_COUNT - done;
  const stage = stageForCount(done);

  /** The headline is a state of the work, not a statistic. */
  const title = isProcessing
    ? 'Your voice is being made.'
    : done === 0
      ? 'Your voice hasn’t started yet.'
      : done < 9
        ? 'Your voice has a beginning.'
        : done < 18
          ? 'Your voice is half gathered.'
          : 'Your voice is nearly whole.';

  const standing = isProcessing
    ? 'This takes a few minutes. You can close this and come back. It will be here.'
    : done === 0
      ? 'Twenty-five moments to record, about twelve minutes of talking in all.'
      : `${capitalize(numberWord(done))} recorded, ${numberWord(remaining)} still to say. There’s no rush.`;

  const rootClass = ['homea-th', reducedMotion ? '' : 'is-playing']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} data-ground={ground}>
      <style>{HOME_A_THRESHOLD_CSS}</style>

      <div className="homea-th__topbar arr">
        <button
          type="button"
          className="homea-th__settings"
          onClick={onSettings}
          aria-label="Settings"
        >
          <GearIcon />
        </button>
      </div>

      <div className="arr">
        <div className="homea-th__stone-wrap" aria-hidden="true">
          <BreathStone
            state={isProcessing ? 'working' : 'idle'}
            size={STONE_SIZE}
            reducedMotion={reducedMotion}
          />
        </div>

        <h1 className="homea-th__title">{title}</h1>
        <p className="homea-th__standing">{standing}</p>
      </div>

      {/* The rule and the line beneath it are the screen's one orchestrated
          beat. Suppressed while building — there is nothing ahead to name, and
          the wait shouldn't be dressed up as anticipation. */}
      {!isProcessing && (
        <>
          <div className="homea-th__rule" aria-hidden="true" />
          <p className="homea-th__ahead">{AHEAD_LINE[stage]}</p>
        </>
      )}

      {isProcessing ? (
        <div className="homea-th__link-wrap arr arr1">
          <button type="button" className="homea-th__link" onClick={onContinue}>
            Check progress
          </button>
        </div>
      ) : (
        <div className="homea-th__cta-wrap arr arr1">
          <button type="button" className="homea-th__cta" onClick={onContinue}>
            {done === 0 ? 'Start recording' : 'Continue recording'}
          </button>
        </div>
      )}

      {footer && <div className="homea-th__footer">{footer}</div>}
    </div>
  );
}

export default HomeAScreenThreshold;
