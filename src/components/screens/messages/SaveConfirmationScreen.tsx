'use client';

/**
 * A7 — Save Confirmation. Quiet ceremonial close: the message is preserved.
 *
 * Production implementation of prototypes/message creation/
 * essence-step6-a7.html. Pure and props-driven per CLAUDE.md: the screen
 * owns the entrance choreography and atmosphere; both CTAs bubble out via
 * callbacks (the page owns navigation). See SaveConfirmationScreen.types.ts
 * for the variant contract and the prototype header for the design memo.
 *
 * The stone is the shared canvas BreathStone in its `infused` state — warm
 * amber, ceremonial — wrapped in a div that owns the prototype's 1200ms
 * arrival. Celebration here is silence with weight: warm light and stone
 * breathing, nothing else (prototype: "DO NOT ADD confetti").
 *
 * Focus lands on the primary CTA at 2600ms — as it becomes visible, not
 * after — or immediately under reduced motion (the screen arrives complete).
 */

import { useEffect, useRef } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import type { SaveConfirmationScreenProps } from './SaveConfirmationScreen.types';
import { SAVE_CONFIRMATION_CSS } from './SaveConfirmationScreen.css';

/** Focus delay: primary reveals at 2400ms (+800ms fade); 2600ms lands the
 *  focus while the button is arriving rather than after. */
const FOCUS_DELAY_MS = 2600;

const STONE_SIZE = 200; // --stone-xl in the prototype's scale

/**
 * "Kept on Apr 23, 2026 · 9:41pm" — the prototype's attestation format,
 * rendered in the user's local timezone from the server's created_at.
 */
export function formatKeptTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-US', { month: 'short' });
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `Kept on ${month} ${d.getDate()}, ${d.getFullYear()} · ${hours}:${minutes}${ampm}`;
}

export function SaveConfirmationScreen({
  recipientName,
  variant,
  savedAtIso,
  onViewShelf,
  onCreateAnother,
  onSeeWhatsComing,
}: SaveConfirmationScreenProps) {
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

  const isThird = variant === 'third';

  return (
    <div className="save-confirm">
      <style>{SAVE_CONFIRMATION_CSS}</style>

      <div className="atmosphere" aria-hidden="true">
        <div className="atmosphere__glow" />
        <div className="atmosphere__vignette" />
      </div>

      <div className="confirm" role="status" aria-live="polite" aria-atomic="true">
        <div className="stone-wrap" aria-hidden="true">
          <BreathStone state="infused" size={STONE_SIZE} reducedMotion={reducedMotion} />
        </div>

        <h1 className="confirm-title">
          Your voice is on the shelf for {recipientName}.
        </h1>
        <p className="confirm-aside">
          They won&rsquo;t know it&rsquo;s there until they need it.
        </p>
        <p className="confirm-timestamp">{formatKeptTimestamp(savedAtIso)}</p>
      </div>

      <div className="footer">
        <button ref={primaryRef} type="button" className="btn" onClick={onViewShelf}>
          View on Memory Shelf
        </button>
        <button
          type="button"
          className="btn--link"
          onClick={isThird ? onSeeWhatsComing : onCreateAnother}
        >
          {isThird ? 'See what’s coming' : 'Create another, when you’re ready'}
        </button>
      </div>
    </div>
  );
}
