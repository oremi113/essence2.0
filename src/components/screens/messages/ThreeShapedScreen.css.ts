/**
 * Scoped stylesheet for C1 — Three Shaped.
 *
 * Ported from prototypes/message creation/essence-step6-pass2-c-screens.html
 * (the `c1` frame). C1 deliberately INHERITS A7's atmosphere — same amber
 * gradient, same 13s ambient glow, same vignette, same infused stone — because
 * it's the ceremonial peak of the same moment. The atmosphere CSS therefore
 * mirrors SaveConfirmationScreen.css.ts near-verbatim (the gold drift is solved
 * the same way: the middle gradient stop uses --color-surface-honey = #F2E8D6,
 * since globals' --color-bg-gold is the darker #E8D8B3; #EDDCAB/#F4E5BC have no
 * production token).
 *
 * Departures from the prototype (the established Step-6 set):
 *   • Phone frame / dev rail / variant label dropped — full-bleed.
 *   • CSS-gradient stone dropped for the shared canvas BreathStone (`infused`).
 *   • Scoped under `.three-shaped`; keyframes `ts-` prefixed.
 *   • `--text-hero` (prototype 40px) and `--line-height-hero` (1.2) have no
 *     production token — literals used.
 *
 * Ceremony cadence (prototype — "the larger moment, slower than A7"):
 *   0ms stone arrival → 1200ms halo begins → 1600ms title → 2000ms aside →
 *   2400ms reassurance → 2800ms primary CTA → 3200ms secondary. Focus lands at
 *   2900ms via the component.
 */
export const THREE_SHAPED_CSS = `
.three-shaped {
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

/* ── Atmosphere — ambient warm glow (13s) + static vignette (A7 parity) ── */
.three-shaped .atmosphere {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
}
.three-shaped .atmosphere__glow {
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 40%,
    rgba(214, 162, 92, 0.32) 0%,
    rgba(214, 162, 92, 0.12) 40%,
    transparent 75%
  );
  animation: ts-ambientGlow 13s var(--ease-essence) infinite;
}
.three-shaped .atmosphere__vignette {
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 120% 90% at 50% 50%,
    transparent 50%,
    rgba(60, 45, 25, 0.08) 85%,
    rgba(60, 45, 25, 0.16) 100%
  );
}
@keyframes ts-ambientGlow {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.04); }
}

/* ── Content stage — vertically centered ceremonial layout ── */
.three-shaped .confirm {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 0 var(--space-xl) var(--space-xl);
}

/* Stone wrapper — arrival + the 7s amber halo (begins as the stone settles). */
.three-shaped .stone-wrap {
  position: relative;
  margin-bottom: var(--space-3xl);
  opacity: 0;
  transform: scale(0.92);
  animation: ts-stoneArrival var(--duration-large) var(--ease-essence) forwards;
}
.three-shaped .stone-wrap::before {
  content: '';
  position: absolute; inset: -32%;
  border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(232, 178, 96, 0.32), transparent 62%);
  opacity: 0;
  animation: ts-stoneHalo 7s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
  pointer-events: none;
}
@keyframes ts-stoneArrival {
  to { opacity: 1; transform: scale(1); }
}
@keyframes ts-stoneHalo {
  0%, 100% { transform: scale(1);    opacity: 0.45; }
  50%      { transform: scale(1.12); opacity: 0.85; }
}

/* ── Copy — staggered ceremony reveals ── */
.three-shaped .c1-title,
.three-shaped .c1-aside,
.three-shaped .c1-reassurance {
  opacity: 0;
  transform: translateY(8px);
  animation: ts-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.three-shaped .c1-title       { animation-delay: 1600ms; }
.three-shaped .c1-aside       { animation-delay: 2000ms; }
.three-shaped .c1-reassurance { animation-delay: 2400ms; }
@keyframes ts-copyReveal {
  to { opacity: 1; transform: translateY(0); }
}

.three-shaped .c1-title {
  font-family: var(--font-display);
  font-size: 40px; /* prototype --text-hero (no prod token) */
  font-weight: 600;
  line-height: 1.2; /* prototype --line-height-hero (no prod token) */
  color: var(--color-text-primary);
  letter-spacing: -0.012em;
  margin-bottom: var(--space-lg);
  max-width: 340px;
  text-wrap: balance;
}
.three-shaped .c1-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 300px;
  margin-bottom: var(--space-lg);
  text-wrap: balance;
}
.three-shaped .c1-reassurance {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-tertiary);
  max-width: 280px;
  letter-spacing: 0.005em;
}

/* ── Footer — two-tier reveal, slowest of the C-set (this is the ceremony) ── */
.three-shaped .footer {
  position: relative; z-index: 1;
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm);
}
.three-shaped .footer .btn,
.three-shaped .footer .btn--link {
  opacity: 0;
  animation: ts-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.three-shaped .footer .btn      { animation-delay: 2800ms; }
.three-shaped .footer .btn--link { animation-delay: 3200ms; }

.three-shaped .btn {
  width: 100%; min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral-dark); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  box-shadow: var(--shadow-mineral);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.three-shaped .btn:not(:disabled):hover { background: var(--color-mineral-darker); }
.three-shaped .btn:not(:disabled):active { transform: scale(0.98); }
.three-shaped .btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-mineral), 0 0 0 4px rgba(122, 128, 136, 0.18);
}

.three-shaped .btn--link {
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
.three-shaped .btn--link:hover {
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}
.three-shaped .btn--link:focus-visible {
  outline: none;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* ── Reduced motion — entrance instant; loops pinned to mid-frame; the canvas
      BreathStone freezes via its prop. The screen arrives complete. ── */
@media (prefers-reduced-motion: reduce) {
  .three-shaped .atmosphere__glow {
    animation: none; opacity: 1; transform: scale(1.04);
  }
  .three-shaped .stone-wrap::before {
    animation: none; opacity: 0.65; transform: scale(1.06);
  }
  .three-shaped .stone-wrap,
  .three-shaped .c1-title,
  .three-shaped .c1-aside,
  .three-shaped .c1-reassurance,
  .three-shaped .footer .btn,
  .three-shaped .footer .btn--link {
    animation: none; opacity: 1; transform: none;
  }
}
`;
