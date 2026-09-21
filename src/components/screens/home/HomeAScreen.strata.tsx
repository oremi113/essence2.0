'use client';

/**
 * Home A — Direction 1, "Strata" (docs/session-home-a/design-directions.md).
 *
 * Design position: what you've already laid down is the hero. The 25 prompts
 * are shown as 25 marks with the script's real stage seams (after 5, after
 * 17), so the shape of the remaining work is legible at a glance without a
 * single label. The count lives in the prose headline, not in a "12 / 25" stat.
 *
 * Pure and props-driven per CLAUDE.md — no Supabase, no redirect, no server
 * actions. The stone is the shared canvas BreathStone (FOLLOW_UPS #35: never
 * fork a bespoke CSS stone), at the handoff's pinned states: `idle` while
 * collecting, `working` while the voice builds.
 */

import { Fragment, useEffect, useState } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { TOTAL_PROMPT_COUNT } from '@/lib/voice-training/script';
import {
  type HomeAScreenProps,
  STAGE_BOUNDS,
  capitalize,
  numberWord,
  stageForCount,
} from './HomeAScreen.types';
import { HOME_A_STRATA_CSS } from './HomeAScreen.strata.css';

const STONE_SIZE = 140;

/** Per-mark ink-in delay. 26ms apart reads as one continuous sweep rather than
 *  25 separate events; the whole run lands inside ~1s even at 25/25. */
const MARK_STAGGER_MS = 26;

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

/** Where you are, in the script's own terms. Named per stage rather than as a
 *  percentage — "the middle stretch" is orienting, "48%" is not. */
const STAGE_LINE: Record<1 | 2 | 3, string> = {
  1: 'You’re in the opening stretch, warm hellos.',
  2: 'You’re in the middle stretch, the one that asks for feeling.',
  3: 'You’re in the last stretch, and these are the short ones.',
};

export function HomeAScreenStrata({
  isProcessing,
  clipsRecorded,
  onContinue,
  onSettings,
  footer,
  reducedMotionOverride,
}: HomeAScreenProps) {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;

  // Arrival ground settle, one shade cooler than Home B's ceremonial version.
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

  const title = isProcessing
    ? 'All twenty-five are in.'
    : done === 0
      ? 'Your voice is waiting to start.'
      : `You’re ${numberWord(done)} moments in.`;

  const sub = isProcessing
    ? 'Your voice is being made now. This takes a few minutes. You can close this and come back. It will be here.'
    : done === 0
      ? 'Twenty-five moments, about twelve minutes of talking. There’s no rush.'
      : `${capitalize(numberWord(remaining))} ahead. There’s no rush.`;

  const rootClass = ['homea-st', reducedMotion ? '' : 'is-playing']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} data-ground={ground}>
      <style>{HOME_A_STRATA_CSS}</style>

      <div className="homea-st__topbar arr">
        <button
          type="button"
          className="homea-st__settings"
          onClick={onSettings}
          aria-label="Settings"
        >
          <GearIcon />
        </button>
      </div>

      <div className="homea-st__stone-section arr">
        <div className="homea-st__stone-wrap" aria-hidden="true">
          <BreathStone
            state={isProcessing ? 'working' : 'idle'}
            size={STONE_SIZE}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>

      <div className="homea-st__head arr arr1">
        <h1 className="homea-st__title">{title}</h1>
        <p className="homea-st__sub">{sub}</p>
      </div>

      {/* The strata band. aria-hidden because the headline above already states
          the count in words — a screen reader hearing 25 list items would be
          noise, not information. */}
      <div className="homea-st__strata arr arr2">
        <div className="homea-st__marks" aria-hidden="true">
          {Array.from({ length: TOTAL_PROMPT_COUNT }, (_, i) => {
            // A seam before the first mark of stages 2 and 3 — the script's own
            // boundaries, not an even split.
            const startsStage = STAGE_BOUNDS.some((s) => s.start === i && s.stage !== 1);
            const isDone = i < done;
            const isNext = i === done && !isProcessing;
            const cls = isDone
              ? 'homea-st__mark homea-st__mark--done'
              : isNext
                ? 'homea-st__mark homea-st__mark--next'
                : 'homea-st__mark';
            return (
              <Fragment key={i}>
                {startsStage && <span className="homea-st__seam" />}
                <span
                  className={cls}
                  style={
                    isDone
                      ? { animationDelay: `${260 + i * MARK_STAGGER_MS}ms` }
                      : isNext
                        ? { animationDelay: `${260 + done * MARK_STAGGER_MS + 120}ms` }
                        : undefined
                  }
                />
              </Fragment>
            );
          })}
        </div>

        {!isProcessing && done > 0 && (
          <p className="homea-st__stage-line">{STAGE_LINE[stage]}</p>
        )}
      </div>

      {isProcessing ? (
        <div className="homea-st__link-wrap arr arr3">
          <button type="button" className="homea-st__link" onClick={onContinue}>
            Check progress
          </button>
        </div>
      ) : (
        <div className="homea-st__cta-wrap arr arr3">
          <button type="button" className="homea-st__cta" onClick={onContinue}>
            {done === 0 ? 'Start recording' : 'Continue recording'}
          </button>
        </div>
      )}

      {footer && <div className="homea-st__footer">{footer}</div>}
    </div>
  );
}

export default HomeAScreenStrata;
