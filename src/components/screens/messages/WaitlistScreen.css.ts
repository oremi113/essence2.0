/**
 * Scoped stylesheet for C2 — Waitlist ("What we're building next").
 *
 * Ported from prototypes/message creation/essence-step6-pass2-c-screens.html
 * (the `c2` + `c2-success` frames), with the established Step-6 production
 * departures:
 *   • Phone frame, dev rail, variant label dropped — full-bleed render.
 *   • Selectors scoped under `.waitlist-screen`; keyframes `wl-` prefixed.
 *   • The CSS-gradient success stone is dropped in favour of the shared canvas
 *     BreathStone in its `shimmer` state (warm, gentle breath — colorTemp 0.2;
 *     the state name matches the prototype's `stone--shimmer` directly). This
 *     follows the A7 precedent (breathing stone → canvas), unlike C3's archive
 *     stone (static → ported gradient, since the canvas archive renders cool).
 *   • Three prototype-local tokens have no production equivalent — replaced
 *     with the literals A7 already uses: `--size-control-md` → 52px,
 *     `--shadow-focus-ring` → 0 0 0 4px rgba(122,128,136,0.18),
 *     `--scale-press` → 0.98.
 *
 * Tone (prototype header): "quieter warm, an announcement not a ceremony."
 * Warm gradient field, staggered reveals, the feature card + email composed
 * as one quiet stack.
 *
 * Entrance choreography — COMPRESSED vs the prototype (decision memo, Chunk 9
 * architect pass): the prototype reveals the submit button at 2900ms, authored
 * as if C2 were a passive confirmation like C1/C3. But C2 is the only
 * INTERACTIVE form in the C-set, reached by a user who tapped "See what's
 * coming" intending to act — a ~3s wait to reach the CTA reads as broken at 4×
 * throttle, not ceremonial. We keep the top-down settle ORDER but pull it
 * forward: eyebrow 600 / title 800 / subtitle 1000 / features 1300 /
 * email 1600ms; submit 1800 / back-link 1950ms (actionable in ~1.8s, not ~2.9s).
 */
export const WAITLIST_CSS = `
.waitlist-screen {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: linear-gradient(
    180deg,
    var(--color-bg-warm-2) 0%,
    var(--color-bg-warm-1) 55%,
    var(--color-bg-warm-2) 100%
  );
}
.waitlist-screen::before {
  content: '';
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(
    ellipse 80% 50% at 50% 18%,
    rgba(214, 180, 130, 0.18) 0%,
    rgba(214, 180, 130, 0.06) 40%,
    transparent 75%
  );
}

/* ── Form stage — scrolls under the absolute footer ── */
.waitlist-screen .waitlist {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: var(--space-xl) var(--space-xl) var(--space-lg);
  overflow-y: auto;
  padding-bottom: calc(var(--space-xl) + 140px);
}

.waitlist-screen .reveal {
  opacity: 0;
  transform: translateY(8px);
  animation: wl-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
@keyframes wl-copyReveal {
  to { opacity: 1; transform: translateY(0); }
}

.waitlist-screen .waitlist-eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-mineral);
  margin-bottom: var(--space-md);
  animation-delay: 600ms;
}
.waitlist-screen .waitlist-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  text-align: center;
  margin-bottom: var(--space-sm);
  max-width: 320px;
  text-wrap: balance;
  animation-delay: 800ms;
}
.waitlist-screen .waitlist-subtitle {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--space-2xl);
  max-width: 300px;
  text-wrap: balance;
  animation-delay: 1000ms;
}

/* ── Feature multi-select card ── */
.waitlist-screen .waitlist-features {
  width: 100%;
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
  animation-delay: 1300ms;
}
.waitlist-screen .waitlist-features-label {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  display: block;
}
.waitlist-screen .waitlist-feature {
  display: flex; align-items: flex-start; gap: var(--space-md);
  padding: var(--space-sm) 0;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
  background: none; border: 0; width: 100%; text-align: left;
}
.waitlist-screen .waitlist-feature + .waitlist-feature {
  border-top: 1px solid rgba(0,0,0,0.04);
}
.waitlist-screen .waitlist-feature__check {
  width: 22px; height: 22px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-text-tertiary);
  background: transparent;
  flex-shrink: 0; margin-top: 2px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--duration-micro) var(--ease-essence),
              border-color var(--duration-micro) var(--ease-essence);
}
.waitlist-screen .waitlist-feature__check svg {
  opacity: 0; transform: scale(0.6); color: #fff;
  transition: opacity var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.waitlist-screen .waitlist-feature[aria-pressed="true"] .waitlist-feature__check {
  background: var(--color-mineral);
  border-color: var(--color-mineral);
}
.waitlist-screen .waitlist-feature[aria-pressed="true"] .waitlist-feature__check svg {
  opacity: 1; transform: scale(1);
}
.waitlist-screen .waitlist-feature__text {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.45;
  color: var(--color-text-primary);
  text-align: left;
  padding-top: 1px;
}
.waitlist-screen .waitlist-feature[aria-pressed="true"] .waitlist-feature__text {
  font-weight: 500;
}
.waitlist-screen .waitlist-feature__helper {
  display: block;
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  margin-top: 2px;
  font-weight: 400;
}
.waitlist-screen .waitlist-feature:focus-visible {
  outline: none;
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* ── Email ── */
.waitlist-screen .waitlist-email {
  width: 100%;
  animation-delay: 1600ms;
}
.waitlist-screen .waitlist-email-label {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
  display: block;
}
.waitlist-screen .waitlist-email-input {
  width: 100%;
  min-height: 52px;
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-neutral);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-text-primary);
  transition: border-color var(--duration-micro) var(--ease-essence),
              box-shadow var(--duration-micro) var(--ease-essence);
}
.waitlist-screen .waitlist-email-input:focus {
  outline: none;
  border-color: var(--color-mineral);
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
}
.waitlist-screen .waitlist-error {
  font-family: var(--font-body);
  font-size: var(--text-small);
  color: var(--color-danger, #B4493B);
  margin-top: var(--space-sm);
}

/* ── Footer — absolute, gradient fade over the scrolling form ── */
.waitlist-screen .footer {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 5;
  padding: var(--space-xl) var(--space-xl) var(--space-2xl);
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm);
  background: linear-gradient(
    180deg,
    rgba(249, 243, 232, 0) 0%,
    rgba(249, 243, 232, 0.95) 40%,
    var(--color-bg-warm-1) 100%
  );
}
.waitlist-screen .footer .btn,
.waitlist-screen .footer .btn--link {
  opacity: 0;
  animation: wl-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.waitlist-screen .footer .btn      { animation-delay: 1800ms; }
.waitlist-screen .footer .btn--link { animation-delay: 1950ms; }

.waitlist-screen .btn {
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
.waitlist-screen .btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.waitlist-screen .btn:not(:disabled):active { transform: scale(0.98); }
.waitlist-screen .btn:disabled {
  background: var(--color-text-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}
.waitlist-screen .btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-mineral), 0 0 0 4px rgba(122, 128, 136, 0.18);
}

.waitlist-screen .btn--link {
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
.waitlist-screen .btn--link:hover {
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}
.waitlist-screen .btn--link:focus-visible {
  outline: none;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* ── Success state — centered, shimmer stone, quick reveal (a confirmation,
      not a slow form) ── */
.waitlist-screen .waitlist-success {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 0 var(--space-xl) var(--space-xl);
}
.waitlist-screen .success-stone-wrap {
  margin-bottom: var(--space-2xl);
  opacity: 0;
  transform: scale(0.92);
  animation: wl-stoneArrival var(--duration-large) var(--ease-essence) forwards;
}
@keyframes wl-stoneArrival {
  to { opacity: 1; transform: scale(1); }
}
.waitlist-screen .waitlist-success-title,
.waitlist-screen .waitlist-success-aside {
  opacity: 0;
  transform: translateY(8px);
  animation: wl-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.waitlist-screen .waitlist-success-title { animation-delay: 600ms; }
.waitlist-screen .waitlist-success-aside { animation-delay: 900ms; }
.waitlist-screen .waitlist-success-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: 1.2; /* prototype --line-height-hero (no prod token) */
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: var(--space-md);
  max-width: 320px;
  text-wrap: balance;
}
.waitlist-screen .waitlist-success-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  text-wrap: balance;
}
/* Success footer — single CTA, quick reveal (not the slow form cadence). */
.waitlist-screen .footer--success .btn { animation-delay: 1200ms; }

/* ── Reduced motion — entrance collapses to instant; the canvas BreathStone
      freezes via its prop. The screen arrives complete. ── */
@media (prefers-reduced-motion: reduce) {
  .waitlist-screen .reveal,
  .waitlist-screen .footer .btn,
  .waitlist-screen .footer .btn--link,
  .waitlist-screen .success-stone-wrap,
  .waitlist-screen .waitlist-success-title,
  .waitlist-screen .waitlist-success-aside {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
`;
