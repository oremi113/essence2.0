/**
 * Scoped stylesheet for A7 — Save Confirmation.
 *
 * Ported near-verbatim from prototypes/message creation/essence-step6-a7.html,
 * with the established departures (the A6 precedent):
 *   • Phone frame, dev rail, and variant label dropped — production renders
 *     full-bleed.
 *   • The CSS-gradient stone + its keyframes dropped — the screen uses the
 *     shared canvas BreathStone in its `infused` state; the wrapper div owns
 *     only the prototype's 1200ms arrival (fade + scale 0.92 → 1).
 *   • Selectors scoped under `.save-confirm`, keyframes `sc-` prefixed, so
 *     nothing leaks global. Tokens resolve from globals.css @theme.
 *
 * Atmosphere note: the prototype's local --color-bg-gold is #F2E8D6, which in
 * the production ramp is --color-surface-honey (globals' --color-bg-gold is
 * the darker #E8D8B3 honey). The gradient below keeps the prototype's exact
 * stops — fidelity over token symmetry; the two literal stops (#EDDCAB,
 * #F4E5BC) have no production token.
 *
 * Entrance choreography (prototype header — "Pure ceremony. Don't rush it."):
 *   0ms stone arrival → 1500ms title → 1800ms aside → 2100ms timestamp →
 *   2400ms primary CTA → 2800ms secondary link. Focus lands at 2600ms via
 *   the component.
 */
export const SAVE_CONFIRMATION_CSS = `
.save-confirm {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: linear-gradient(
    180deg,
    #EDDCAB 0%,
    var(--color-surface-honey) 45%,
    #F4E5BC 100%
  );
}

/* ── Atmosphere — ambient warm glow (13s) + static vignette ── */
.save-confirm .atmosphere {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
}
.save-confirm .atmosphere__glow {
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 42%,
    rgba(214, 162, 92, 0.30) 0%,
    rgba(214, 162, 92, 0.12) 40%,
    transparent 75%
  );
  animation: sc-ambientGlow 13s var(--ease-essence) infinite;
}
.save-confirm .atmosphere__vignette {
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 120% 90% at 50% 50%,
    transparent 50%,
    rgba(60, 45, 25, 0.08) 85%,
    rgba(60, 45, 25, 0.16) 100%
  );
}
@keyframes sc-ambientGlow {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.04); }
}

/* ── Content stage — vertically centered ceremonial layout. No backbar:
      the save is committed, the flow is over. ── */
.save-confirm .confirm {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 0 var(--space-xl) var(--space-xl);
}

/* Stone wrapper — arrival + the prototype's 7s amber halo. The canvas
   BreathStone owns the body breath; the halo is the second of the four
   breathing harmonics (body 5s · halo 7s · ambient 13s — none in sync)
   and begins once the stone settles at 1200ms. */
.save-confirm .stone-wrap {
  position: relative;
  margin-bottom: var(--space-3xl);
  opacity: 0;
  transform: scale(0.92);
  animation: sc-stoneArrival var(--duration-large) var(--ease-essence) forwards;
}
.save-confirm .stone-wrap::before {
  content: '';
  position: absolute; inset: -32%;
  border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(232, 178, 96, 0.32), transparent 62%);
  opacity: 0;
  animation: sc-stoneHalo 7s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
  pointer-events: none;
}
@keyframes sc-stoneArrival {
  to { opacity: 1; transform: scale(1); }
}
@keyframes sc-stoneHalo {
  0%, 100% { transform: scale(1);    opacity: 0.45; }
  50%      { transform: scale(1.12); opacity: 0.85; }
}

/* ── Copy — staggered reveals after the stone settles (~1200ms) ── */
.save-confirm .confirm-title,
.save-confirm .confirm-aside,
.save-confirm .confirm-timestamp {
  opacity: 0;
  transform: translateY(8px);
  animation: sc-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.save-confirm .confirm-title     { animation-delay: 1500ms; }
.save-confirm .confirm-aside     { animation-delay: 1800ms; }
.save-confirm .confirm-timestamp { animation-delay: 2100ms; }
@keyframes sc-copyReveal {
  to { opacity: 1; transform: translateY(0); }
}

.save-confirm .confirm-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: var(--space-md);
  max-width: 340px;
  text-wrap: balance;
}

.save-confirm .confirm-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  margin-bottom: var(--space-lg);
  text-wrap: balance;
}

/* Timestamp attestation — museum-label voice; quiet proof of the moment.
   Warm sepia at the 16px floor (architect pass 2026-06-12): the tertiary
   grey token lands ~1.9:1 on the gold field and 14px sits under the 45-70
   floor. #6E5E44 is ~5:1 here and on-temperature; hierarchy comes from
   color + italic, not sub-floor size. */
.save-confirm .confirm-timestamp {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body);
  color: #6E5E44;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

/* ── Footer — two-tier reveal: primary with weight, secondary follows ── */
.save-confirm .footer {
  position: relative; z-index: 1;
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm);
}
.save-confirm .footer .btn,
.save-confirm .footer .btn--link {
  opacity: 0;
  animation: sc-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.save-confirm .footer .btn      { animation-delay: 2400ms; }
.save-confirm .footer .btn--link { animation-delay: 2800ms; }

.save-confirm .btn {
  width: 100%; min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  /* Warm-keyed lift so the CTA belongs to the amber world — deliberately
     NOT --shadow-mineral, whose teal key is stale against the live mineral
     and off-temperature here (FOLLOW_UPS #40). */
  box-shadow: 0 4px 14px rgba(110, 80, 40, 0.22);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.save-confirm .btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.save-confirm .btn:not(:disabled):active { transform: scale(0.98); }
.save-confirm .btn:focus-visible {
  outline: none;
  /* Ring layers OVER the warm lift — the CTA is focused by default after
     the entrance, so replacing the shadow would flatten it at rest. */
  box-shadow: 0 4px 14px rgba(110, 80, 40, 0.22),
              0 0 0 4px rgba(122, 128, 136, 0.18);
}

.save-confirm .btn--link {
  background: transparent;
  color: var(--color-text-secondary);
  border: 0;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-body);
  min-height: 44px;
  width: auto;
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
  transition: color var(--duration-micro) var(--ease-essence),
              text-decoration-color var(--duration-micro) var(--ease-essence);
}
.save-confirm .btn--link:hover {
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}
.save-confirm .btn--link:focus-visible {
  outline: none;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* ── Reduced motion — entrance collapses to instant and every loop is
      PINNED to its explicit mid-frame values (never paused: pausing inside
      a delay window falls back to base styles, which over- or undershoots
      the animated range — architect pass 2026-06-12). The screen arrives
      complete. (BreathStone freezes via its prop.) ── */
@media (prefers-reduced-motion: reduce) {
  .save-confirm .atmosphere__glow {
    animation: none;
    opacity: 1;
    transform: scale(1.04);
  }
  .save-confirm .stone-wrap::before {
    animation: none;
    opacity: 0.65;
    transform: scale(1.06);
  }
  .save-confirm .stone-wrap {
    animation: none;
    opacity: 1;
    transform: scale(1);
  }
  .save-confirm .confirm-title,
  .save-confirm .confirm-aside,
  .save-confirm .confirm-timestamp,
  .save-confirm .footer .btn,
  .save-confirm .footer .btn--link {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
`;
