'use client';

/**
 * C3 — Vault Limit Reached. The capped steady-state (3/3 saved): the user
 * got the three messages the plan includes, and their voice stays preserved.
 *
 * Production implementation of the `c3` frame in prototypes/message creation/
 * essence-step6-pass2-c-screens.html. Pure and props-driven per CLAUDE.md:
 * the screen owns the entrance choreography and atmosphere; both CTAs bubble
 * out via callbacks (the page owns navigation + the surface telemetry).
 *
 * Tone (prototype header): "the calmest of the three… a gentle fact, not an
 * event." No celebration, no scarcity framing — value-add stewardship. See
 * the prototype's DO-NOT-ADD list (no countdowns, no upgrade CTAs, no
 * save-offer language).
 *
 * Focus lands on the primary CTA at 1400ms — as it becomes visible (footer
 * reveals at 1300ms) — or immediately under reduced motion (the screen
 * arrives complete).
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import type { VaultLimitScreenProps } from './VaultLimitScreen.types';
import { VAULT_LIMIT_CSS } from './VaultLimitScreen.css';

/** Focus delay: primary reveals at 1300ms; 1400ms lands focus as it arrives. */
const FOCUS_DELAY_MS = 1400;

export function VaultLimitScreen({
  onVisitShelf,
  onSeeWhatsComing,
}: VaultLimitScreenProps) {
  const reducedMotion = useReducedMotion();
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Accessibility: primary CTA receives focus once the entrance completes —
  // immediately when reduced motion collapses the entrance to instant.
  useEffect(() => {
    const id = setTimeout(
      () => primaryRef.current?.focus({ preventScroll: true }),
      reducedMotion ? 0 : FOCUS_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [reducedMotion]);

  return (
    <div className="vault-limit">
      <style>{VAULT_LIMIT_CSS}</style>

      <div className="atmosphere" aria-hidden="true" />

      <div className="confirm" role="status" aria-live="polite" aria-atomic="true">
        <div className="stone" aria-hidden="true">
          <div className="stone__body" />
        </div>

        <p className="vl-eyebrow reveal">Your Vault</p>
        <h1 className="vl-title reveal">Three messages, kept.</h1>
        <p className="vl-aside reveal">
          Your voice stays preserved. You can revisit what you&rsquo;ve saved
          anytime.
        </p>
      </div>

      <div className="footer">
        <button ref={primaryRef} type="button" className="btn" onClick={onVisitShelf}>
          Visit your Memory Shelf
        </button>
        <button type="button" className="btn--link" onClick={onSeeWhatsComing}>
          See what&rsquo;s coming
        </button>
      </div>
    </div>
  );
}
