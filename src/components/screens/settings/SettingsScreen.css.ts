/**
 * Settings & Trust — production stylesheet for
 * prototypes/essence-step9-settings-trust.html. Mirrors its layout, grouping,
 * state expression, and motion. Injected via <style>{SETTINGS_CSS}</style> and
 * scoped under `.set`, the same template-string convention as HomeBScreen.css.
 *
 * Colors resolve to the canonical globals.css @theme tokens. The three tokens
 * the prototype declared locally — --color-lapsed-surface, --color-lapsed-border,
 * --color-hairline — now live in @theme (Step 9 block), so a verbatim port
 * renders the paused-pill fills / borders / row hairlines correctly.
 *
 * A small set of EFFECT-only values are prototype-local (@theme defines no token
 * for them) and stay flagged inline: skeleton gradient stops, scrim tint, the
 * upward sheet shadow, the btn-warn hover tint, and #fff on the switch knob /
 * confirm field / primary-button text (the same literal HomeBScreen.css uses).
 *
 * Two deliberate departures from the prototype's device-framed markup:
 *  1. No device chrome (status bar / island / home indicator) — production runs
 *     inside the real app viewport, so the root mirrors Home B's page frame.
 *  2. The bottom sheet's bottom corners are square (flush to the viewport
 *     bottom), not the prototype's 44px device-radius match.
 */
export const SETTINGS_CSS = `
.set {
  position: relative;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg) var(--space-3xl);
  background: var(--color-bg-neutral);
  color: var(--color-text-primary);
}

/* ===== top bar (back + title) ===== */
.set__topbar {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  height: 44px;
  margin-bottom: 10px;
}
.set__back {
  width: 44px; height: 44px;
  margin-left: -10px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  transition: color var(--duration-micro) var(--ease-essence);
}
.set__back:hover { color: var(--color-text-primary); }
.set__back:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }
.set__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 22px;
  color: var(--color-text-primary);
}

/* ===== trust band (the emotional anchor) ===== */
.set__trust {
  background: var(--color-surface-honey);
  border: 1px solid var(--color-lapsed-border);
  border-radius: var(--radius-2xl);
  padding: 22px 22px 20px;
  margin-bottom: var(--space-xl);
}
.set__trust-lead {
  font-family: var(--font-display);
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-primary);
}
.set__trust-sub {
  margin-top: 10px;
  font-size: var(--text-small);
  color: var(--color-text-secondary-strong);
  font-family: var(--font-body);
  line-height: 1.5;
}
/* slim residual: the trust band after it's been seen once (one line, no lead) */
.set__trust--slim {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 13px 18px;
}
.set__trust--slim .set__trust-sub { margin-top: 0; }
.set__trust-lock { flex-shrink: 0; color: var(--color-mineral); }

/* ===== sections ===== */
.set__section { margin-bottom: var(--space-xl); }
.set__eyebrow {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-secondary);
  margin: 0 4px 10px;
}
.set__card {
  background: var(--color-surface-card);
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

/* ===== inline card-updated notice (return from Stripe) ===== */
.set__notice {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-surface-honey);
  border: 1px solid var(--color-lapsed-border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  margin-bottom: var(--space-lg);
  font-size: var(--text-small);
  color: var(--color-text-primary);
}
.set__notice-dot {
  width: 7px; height: 7px; border-radius: var(--radius-full);
  background: var(--color-status-success); flex-shrink: 0;
}

/* ===== status pill (the single Voice Vault carrier) ===== */
.set__plan-head { padding: 20px 18px 4px; }
.set__pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 9px 16px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-honey);
  border: 1px solid transparent;
  font-size: var(--text-body);
  line-height: 1.4;
  color: var(--color-text-primary);
}
.set__pill-dot {
  width: 7px; height: 7px; border-radius: var(--radius-full);
  background: var(--color-mineral); flex-shrink: 0;
}
.set__pill--protected { background: var(--color-surface-warm); }
.set__pill--paused {
  background: var(--color-lapsed-surface);
  border-color: var(--color-lapsed-border);
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.set__pill-main { font-weight: 600; }
.set__pill-sub {
  font-size: var(--text-small);
  color: var(--color-text-secondary-strong);
}

.set__plan-body { padding: 14px 18px 18px; }
.set__plan-line {
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-text-primary);
}
.set__plan-line.sub {
  margin-top: 6px;
  font-size: var(--text-small);
  color: var(--color-text-secondary);
}
.set__plan-fixable {
  margin-top: 4px;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-text-primary);
}

/* ===== rows ===== */
.set__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 56px;
  padding: 12px 18px;
  border-top: 1px solid var(--color-hairline);
}
.set__row:first-child { border-top: none; }
.set__row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.set__row-label { font-size: var(--text-body); color: var(--color-text-primary); }
.set__row-value { font-size: var(--text-small); color: var(--color-text-secondary); }
.set__row-action {
  flex-shrink: 0;
  min-height: 44px;
  display: flex; align-items: center;
  background: none; border: none; cursor: pointer;
  font-family: var(--font-body);
  font-size: var(--text-ui);
  font-weight: 500;
  color: var(--color-mineral-dark);
  padding: 0 2px;
}
.set__row-action:hover { color: var(--color-mineral-darker); }
.set__row-action:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; border-radius: 6px; }
.set__row-foot {
  padding: 0 18px 14px;
  margin-top: -4px;
  font-size: var(--text-small);
  color: var(--color-text-secondary-strong);
  line-height: 1.5;
}

/* avatar (photo row) */
.set__avatar {
  width: 40px; height: 40px; border-radius: var(--radius-full);
  background: var(--color-surface-warm);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-size: 18px;
  color: var(--color-text-secondary-strong);
  flex-shrink: 0;
  overflow: hidden;
}
.set__avatar img { width: 100%; height: 100%; object-fit: cover; }
.set__photo-row .set__row-main { flex-direction: row; align-items: center; gap: 12px; }

/* ===== primary action button ===== */
.set__action-stack { padding: 4px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.set__btn {
  width: 100%;
  min-height: 52px;
  border-radius: var(--radius-lg);
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background var(--duration-micro) var(--ease-press),
              transform var(--duration-micro) var(--ease-press),
              opacity var(--duration-micro) var(--ease-essence);
}
.set__btn:active { transform: translateY(1px); }
.set__btn:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 3px; }
.set__btn[disabled] { cursor: default; }
.set__btn--primary {
  background: var(--color-mineral-dark);
  color: #fff;   /* prototype-local: literal button text, matches HomeBScreen.css */
  box-shadow: var(--shadow-mineral);
}
.set__btn--primary:hover { background: var(--color-mineral-darker); }
.set__btn--primary[disabled] { opacity: 0.7; }
.set__btn--quiet {
  background: transparent;
  color: var(--color-text-secondary);
  min-height: 44px;
  font-weight: 500;
  box-shadow: none;
}
.set__btn--quiet:hover { color: var(--color-text-primary); }
.set__btn-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: set-spin 700ms linear infinite;
}
.set__btn--warn .set__btn-spinner {
  border-color: rgba(138,90,30,0.35);
  border-top-color: var(--color-status-warning);
}

/* ===== toggle switch ===== */
.set__switch {
  position: relative;
  width: 48px; height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-surface-warm);
  border: 1px solid var(--color-lapsed-border);
  cursor: pointer; flex-shrink: 0;
  padding: 0;
  transition: background var(--duration-small) var(--ease-essence);
}
.set__switch::after {
  content: "";
  position: absolute;
  top: 2px; left: 2px;
  width: 22px; height: 22px;
  border-radius: var(--radius-full);
  background: #fff;   /* prototype-local: switch knob */
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-small) var(--ease-essence);
}
.set__switch[aria-checked="true"] { background: var(--color-mineral-dark); border-color: var(--color-mineral-dark); }
.set__switch[aria-checked="true"]::after { transform: translateX(20px); }
.set__switch:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 3px; }

/* ===== manage zone (quiet) ===== */
.set__section--manage .set__card { background: var(--color-bg-warm-1); }
.set__row-action--signout { color: var(--color-text-primary); font-weight: 500; }
.set__row-action--delete { color: var(--color-text-secondary); font-weight: 500; }
.set__row-action--delete:hover { color: var(--color-text-primary); }

/* ===== system views (loading / error / terminal) ===== */
.set__system {
  position: absolute;
  inset: 0;
  background: var(--color-bg-neutral);
  z-index: 40;
  padding: var(--space-xl) var(--space-lg) var(--space-3xl);
  overflow-y: auto;
}
.set__centered {
  min-height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 0 16px;
}
.set__centered h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-title);
  line-height: 1.3;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}
.set__centered p {
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  margin-bottom: 26px;
}
.set__centered .set__btn { max-width: 260px; }
.set__centered .set__btn + .set__btn { margin-top: 10px; }

/* loading skeleton */
.set__sk {
  background: var(--color-surface-card);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  margin-bottom: var(--space-xl);
}
/* prototype-local: skeleton gradient stops (effect values @theme does not define) */
.set__sk-line {
  height: 14px; border-radius: 7px;
  background: linear-gradient(90deg, #ECE5DA 25%, #F4EEE5 37%, #ECE5DA 63%);
  background-size: 400% 100%;
  margin: 0 0 10px;
  animation: set-sk-sweep 1.6s linear infinite;
}
.set__sk-band {
  height: 92px; border-radius: var(--radius-2xl);
  background: linear-gradient(90deg, #F0E7D6 25%, #F6EEDF 37%, #F0E7D6 63%);
  background-size: 400% 100%;
  margin-bottom: var(--space-xl); opacity: 0.7;
  animation: set-sk-sweep 1.6s linear infinite;
}
.set__sk-pad { padding: 18px; }

/* ===== bottom sheets (overlays) ===== */
.set__scrim {
  position: fixed; inset: 0;
  background: rgba(28,26,24,0.32);   /* prototype-local: scrim tint, @theme has no token */
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--duration-micro) var(--ease-essence),
              visibility 0s linear var(--duration-micro);
}
.set__scrim.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity var(--duration-micro) var(--ease-essence);
}
.set__sheet {
  width: 100%;
  max-width: 430px;
  background: var(--color-bg-neutral);
  border-radius: 28px 28px 0 0;   /* prototype-local: bespoke top-sheet radius; bottom flush to viewport */
  padding: 26px 24px 30px;
  padding-bottom: calc(30px + env(safe-area-inset-bottom, 0px));
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 -8px 28px rgba(0,0,0,0.18);   /* prototype-local: upward sheet shadow, @theme has no token */
  transform: translateY(100%);
  transition: transform 280ms var(--ease-essence);          /* close: faster */
  will-change: transform;
}
.set__scrim.is-open .set__sheet {
  transform: translateY(0);
  transition: transform var(--duration-small) var(--ease-page);  /* open */
}
.set__sheet:focus { outline: none; }
.set__sheet h3 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 23px;
  line-height: 1.3;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}
.set__sheet p {
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
}
.set__sheet p.reassure { color: var(--color-text-primary); }
.set__sheet-actions { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }

/* delete: two beats crossfade in place, scrim + sheet held */
.set__delete-stack { display: grid; }
.set__delete-stack > .set__beat {
  grid-area: 1 / 1;
  transition: opacity 250ms var(--ease-essence);
}
.set__delete-stack > .set__beat[data-active="false"] { opacity: 0; pointer-events: none; }
.set__delete-stack > .set__beat[data-active="true"]  { opacity: 1; pointer-events: auto; }

.set__btn--warn {
  background: transparent;
  color: var(--color-status-warning);
  border: 1.5px solid var(--color-status-warning);
  box-shadow: none;
  transition: opacity var(--duration-micro) var(--ease-essence),
              background var(--duration-micro) var(--ease-press);
}
.set__btn--warn:hover:not([disabled]) { background: rgba(138,90,30,0.06); }   /* prototype-local: warning-tint hover */
.set__btn--warn[disabled] { opacity: 0.32; cursor: not-allowed; }

/* type-to-confirm / email field */
.set__field {
  width: 100%;
  min-height: 52px;
  border: 1.5px solid var(--color-lapsed-border);
  border-radius: var(--radius-lg);
  padding: 0 16px;
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-text-primary);
  background: #fff;   /* prototype-local: input surface */
  margin: 6px 0 4px;
  letter-spacing: 0.04em;
}
.set__field:focus { outline: none; border-color: var(--color-mineral); }
.set__field--error { border-color: var(--color-status-error); }
.set__field-hint { font-size: var(--text-small); color: var(--color-text-secondary); margin-bottom: 6px; }
.set__field-error {
  font-size: var(--text-small);
  color: var(--color-status-error);
  line-height: 1.4;
  margin: 2px 0 6px;
}

/* ===== page arrival (light, section-level, signature ease-page) ===== */
.set__content > * { opacity: 1; }   /* default resting (no flash) */
.set__content.is-arriving > * {
  animation: set-arrive 550ms var(--ease-page) both;
}
.set__content.is-arriving > *:nth-child(1) { animation-delay: 0ms; }
.set__content.is-arriving > *:nth-child(2) { animation-delay: 60ms; }
.set__content.is-arriving > *:nth-child(3) { animation-delay: 120ms; }
.set__content.is-arriving > *:nth-child(4) { animation-delay: 170ms; }
.set__content.is-arriving > *:nth-child(5) { animation-delay: 220ms; }
.set__content.is-arriving > *:nth-child(6) { animation-delay: 270ms; }
.set__content.is-arriving > *:nth-child(7) { animation-delay: 320ms; }

@keyframes set-arrive {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
@keyframes set-sk-sweep {
  0%   { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
@keyframes set-spin { to { transform: rotate(360deg); } }

/* ===== reduced motion: pin to resting (final/closed) state ===== */
@media (prefers-reduced-motion: reduce) {
  .set *, .set *::before, .set *::after { animation: none !important; transition: none !important; }
}
`;
