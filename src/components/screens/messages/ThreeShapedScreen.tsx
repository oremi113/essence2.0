'use client';

/**
 * C1 — Three Shaped. The one-time ceremonial close after a user saves their
 * 3rd (final) message: their three are kept, their voice is preserved, more is
 * coming. The largest, slowest moment in the C-set.
 *
 * Production implementation of the `c1` frame in prototypes/message creation/
 * essence-step6-pass2-c-screens.html. Pure and props-driven per CLAUDE.md: the
 * screen owns the entrance choreography + atmosphere; both CTAs bubble out (the
 * page owns navigation + the one-time latch).
 *
 * Atmosphere is intentionally A7's (amber gold field, 13s ambient glow, infused
 * BreathStone) — C1 is the ceremonial peak of the same moment, not a new
 * visual language. Celebration is silence with weight (prototype: no confetti).
 *
 * Focus lands on the primary CTA at 2900ms — as it reveals (2800ms) — or
 * immediately under reduced motion (the screen arrives complete).
 */

import { useEffect, useRef } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import type { ThreeShapedScreenProps } from './ThreeShapedScreen.types';
import { THREE_SHAPED_CSS } from './ThreeShapedScreen.css';

/** Focus delay: primary reveals at 2800ms; 2900ms lands focus as it arrives. */
const FOCUS_DELAY_MS = 2900;
const STONE_SIZE = 200; // --stone-xl, A7 parity

export function ThreeShapedScreen({
  onSeeWhatsComing,
  onBackHome,
}: ThreeShapedScreenProps) {
  const reducedMotion = useReducedMotion();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setTimeout(
      () => primaryRef.current?.focus({ preventScroll: true }),
      reducedMotion ? 0 : FOCUS_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [reducedMotion]);

  return (
    <div className="three-shaped">
      <style>{THREE_SHAPED_CSS}</style>

      <div className="atmosphere" aria-hidden="true">
        <div className="atmosphere__glow" />
        <div className="atmosphere__vignette" />
      </div>

      <div className="confirm" role="status" aria-live="polite" aria-atomic="true">
        <div className="stone-wrap" aria-hidden="true">
          <BreathStone state="infused" size={STONE_SIZE} reducedMotion={reducedMotion} />
        </div>

        <h1 className="c1-title">Three are kept.</h1>
        <p className="c1-aside">
          The messages you shaped for the people you love are on the shelf, safe.
        </p>
        <p className="c1-reassurance">
          Your voice stays preserved in your Vault. More ways to use it are on
          the way.
        </p>
      </div>

      <div className="footer">
        <button ref={primaryRef} type="button" className="btn" onClick={onSeeWhatsComing}>
          See what&rsquo;s coming
        </button>
        <button type="button" className="btn--link" onClick={onBackHome}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
