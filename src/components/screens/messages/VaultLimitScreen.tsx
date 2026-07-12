'use client';

/**
 * C3 — Vault Limit Reached. The capped steady-state (3/3 saved): the user
 * got the three messages the plan includes, and their voice stays preserved.
 *
 * Production implementation of prototypes/essence-c3-vault-limit.html (the
 * 2026-07 design pass that re-anchored C3 from the old warm-amber Breath-Stone
 * to the Vault object at rest). Pure and props-driven per CLAUDE.md: the
 * screen owns the entrance choreography and atmosphere; both CTAs bubble out
 * via callbacks (the page owns navigation + the surface telemetry).
 *
 * Hero object: the canonical Vault, sealed + ignited, drawn ONCE at rest via
 * the shared engine (`src/lib/vault-render`) — NOT the prototype's inlined
 * fork, NOT a mutated palette (FOLLOW_UPS #74). Drive {mechT:1, emberT:1} is
 * the sealed-and-caught frame; there is no rAF loop, only a repaint on mount
 * and on resize/DPR change. "No idle loop" holds at the code level.
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
import { paintVaultFrame } from '@/lib/vault-render/paintVault';
import type { VaultLimitScreenProps } from './VaultLimitScreen.types';
import { VAULT_LIMIT_CSS } from './VaultLimitScreen.css';

/** Focus delay: primary reveals at 1300ms; 1400ms lands focus as it arrives. */
const FOCUS_DELAY_MS = 1400;

/** C3's vault is full and lit, held still: sealed mechanism, caught ember. */
const REST_DRIVE = { mechT: 1, emberT: 1 } as const;

export function VaultLimitScreen({
  onVisitShelf,
  onSeeWhatsComing,
}: VaultLimitScreenProps) {
  const reducedMotion = useReducedMotion();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The Vault at rest — a single paint via the shared engine. First paint may
  // land before layout resolves (canvas clientWidth 0); retry once next frame.
  // Repaint on resize/orientation so the backing store tracks the box × DPR.
  // No animation loop: the object is archive-still.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const paint = () => {
      if (!paintVaultFrame(canvas, REST_DRIVE)) {
        raf = requestAnimationFrame(paint);
      }
    };
    paint();

    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

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

      <div className="confirm" role="status" aria-live="polite" aria-atomic="true">
        <div className="vault-wrap" aria-hidden="true">
          <div className="vault-limit__ground" />
          <canvas ref={canvasRef} className="vault-limit__canvas" />
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
