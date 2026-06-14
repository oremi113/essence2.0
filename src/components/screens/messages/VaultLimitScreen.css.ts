/**
 * Scoped stylesheet for C3 — Vault Limit Reached.
 *
 * Ported from prototypes/message creation/essence-step6-pass2-c-screens.html
 * (the `c3` frame), with the established Step-6 production departures:
 *   • Phone frame, dev rail, and variant label dropped — full-bleed render.
 *   • Selectors scoped under `.vault-limit`; keyframes `vl-` prefixed so
 *     nothing leaks global. Tokens resolve from globals.css @theme.
 *   • Primary btn carries `--shadow-mineral` (the prototype's c3 btn omits
 *     it) — matches A7 + the app-wide primary-button lift.
 *
 * Stone divergence from the A7 precedent (deliberate): A7 uses the shared
 * canvas BreathStone because its stone *breathes* (the engine's whole value
 * is live animation). C3's stone is "archive" — preserved, still, NO MOTION.
 * The canvas engine's `archive` target renders cool (colorTemp -0.1), which
 * contradicts the prototype's explicit "warm amber family, dialed down, at
 * rest." So C3 ports the prototype's self-contained warm-amber CSS-gradient
 * stone verbatim — for a static stone the canvas buys nothing, and fidelity
 * to the warm tone wins.
 *
 * Tone (prototype header): "the calmest of the three… not an event, a gentle
 * fact." Cream background, near-imperceptible warm wash, no animated ambient
 * glow (A7 has one; C3 does not), faster entrance than the ceremony screens.
 *
 * Entrance choreography (prototype timings — a state, not a moment):
 *   0ms stone arrival → 700ms eyebrow → 900ms title → 1100ms aside →
 *   1300ms primary CTA → 1500ms secondary link. Focus lands at 1400ms via
 *   the component.
 */
export const VAULT_LIMIT_CSS = `
.vault-limit {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: var(--color-bg-neutral);
}

/* ── Atmosphere — a single, very subtle, STATIC warm wash. No animation:
      this is the settled steady-state, not a ceremony. ── */
.vault-limit .atmosphere {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(
    ellipse 85% 60% at 50% 35%,
    rgba(214, 180, 130, 0.10) 0%,
    transparent 70%
  );
}

/* ── Content stage — anchored toward the top (grounded, not floating).
      No backbar: the cap is a fact, there's nothing to go "back" within. ── */
.vault-limit .confirm {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start;
  text-align: center;
  padding: var(--space-4xl) var(--space-xl) var(--space-xl);
}

/* ── Stone — archive: warm amber, preserved, still. Small. The prototype's
      --stone-sm (100px) has no production token, so the literal is kept. ── */
.vault-limit .stone {
  position: relative;
  width: 100px; height: 100px;
  border-radius: var(--radius-full);
  margin-bottom: var(--space-lg);
  opacity: 0;
  transform: scale(0.92);
  animation: vl-stoneArrival var(--duration-large) var(--ease-essence) forwards;
}
.vault-limit .stone::before {
  content: '';
  position: absolute; inset: -20%;
  border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(200, 150, 80, 0.18), transparent 62%);
  pointer-events: none;
}
.vault-limit .stone::after {
  content: '';
  position: absolute; top: 15%; left: 22%;
  width: 28%; height: 19%;
  background: radial-gradient(ellipse, rgba(255, 245, 220, 0.50), transparent 70%);
  border-radius: var(--radius-full);
  filter: blur(5px); opacity: 0.6; pointer-events: none;
}
.vault-limit .stone__body {
  width: 100%; height: 100%;
  border-radius: var(--radius-full);
  background: radial-gradient(circle at 30% 28%, #F6E4BC 0%, #DDB778 28%, #B08A4A 60%, #6B4E25 92%);
  box-shadow:
    0 18px 36px rgba(120, 85, 40, 0.22),
    inset -14px -20px 44px rgba(85, 55, 20, 0.38),
    inset 14px 14px 32px rgba(255, 240, 210, 0.36);
}
@keyframes vl-stoneArrival {
  to { opacity: 1; transform: scale(1); }
}

/* ── Copy — staggered reveals; faster cadence than the ceremony screens ── */
.vault-limit .reveal {
  opacity: 0;
  transform: translateY(8px);
  animation: vl-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.vault-limit .vl-eyebrow { animation-delay: 700ms; }
.vault-limit .vl-title   { animation-delay: 900ms; }
.vault-limit .vl-aside   { animation-delay: 1100ms; }
@keyframes vl-copyReveal {
  to { opacity: 1; transform: translateY(0); }
}

.vault-limit .vl-eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-mineral);
  margin-bottom: var(--space-sm);
}
.vault-limit .vl-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: var(--space-md);
  max-width: 320px;
  text-wrap: balance;
}
.vault-limit .vl-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 290px;
  text-wrap: balance;
}

/* ── Footer — two-tier reveal, faster than the ceremony screens ── */
.vault-limit .footer {
  position: relative; z-index: 1;
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm);
}
.vault-limit .footer .btn,
.vault-limit .footer .btn--link {
  opacity: 0;
  animation: vl-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.vault-limit .footer .btn      { animation-delay: 1300ms; }
.vault-limit .footer .btn--link { animation-delay: 1500ms; }

.vault-limit .btn {
  width: 100%; min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  box-shadow: var(--shadow-mineral);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.vault-limit .btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.vault-limit .btn:not(:disabled):active { transform: scale(0.98); }
.vault-limit .btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-mineral),
              0 0 0 4px rgba(122, 128, 136, 0.18);
}

.vault-limit .btn--link {
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
.vault-limit .btn--link:hover {
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}
.vault-limit .btn--link:focus-visible {
  outline: none;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* ── Reduced motion — entrance collapses to instant; the stone is already
      static, so there is no loop to pin. The screen arrives complete. ── */
@media (prefers-reduced-motion: reduce) {
  .vault-limit .stone,
  .vault-limit .reveal,
  .vault-limit .footer .btn,
  .vault-limit .footer .btn--link {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
`;
