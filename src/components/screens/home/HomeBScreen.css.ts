/**
 * Home B — the completed-user hub. Production stylesheet for
 * prototypes/essence-step8-home-b.html; mirrors its layout, timing, motion,
 * and copy register. Injected via <style>{HOME_B_CSS}</style> and scoped under
 * `.homeb`, the same template-string convention as SaveConfirmationScreen.css.
 *
 * Two deliberate departures from the prototype's self-contained :root:
 *  1. The stone is the shared canvas BreathStone (state="infused"), NOT the
 *     prototype's CSS-gradient approximation — the canvas owns the glow / ember
 *     / ripple internally (FOLLOW_UPS #35: never fork bespoke CSS stones).
 *  2. Colors resolve to the canonical globals.css @theme tokens. Where the
 *     prototype's local name drifted from globals (its `--color-bg-rich`
 *     #EDE3D0 is globals' `--color-surface-warm`), we use the token that
 *     reproduces the prototype's pixels — this drift was the root cause of the
 *     Step 7 "disjointed" finding the handoff warns about.
 *
 * The prototype-local values the design language names — the CTA pressed fill
 * and the AA-safe warm-surface grey — were promoted to canonical @theme tokens
 * (`--color-mineral-darker`, `--color-text-secondary-strong`). Only the lapsed
 * pill's divider border stays a flagged one-off (no fitting token).
 */
export const HOME_B_CSS = `
.homeb {
  position: relative;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg) 56px;
  background: var(--color-bg-neutral);
  /* first-arrival ground settle: opens on the warm ceremonial ground, eases
     to cream over 1.5s (rich = globals --color-surface-warm #EDE3D0). */
  transition: background 1500ms var(--ease-page);
}
.homeb[data-ground="rich"] { background: var(--color-surface-warm); }

/* ---------- top bar (settings, quiet) ---------- */
.homeb__topbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 44px;
  margin-bottom: var(--space-sm);
}
.homeb__settings {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  transition: color var(--duration-micro) var(--ease-essence);
  margin-right: -10px;
}
.homeb__settings:hover { color: var(--color-text-primary); }
.homeb__settings:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }

/* ---------- stone ---------- */
.homeb__stone-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: var(--space-xl);
}
.homeb__stone-wrap {
  position: relative;
  width: 200px; height: 200px;
  display: flex; align-items: center; justify-content: center;
}
/* ground shadow beneath the stone (canvas owns the glow/ember/ripple) */
.homeb__stone-wrap::after {
  content: "";
  position: absolute;
  bottom: -6px; left: 50%;
  transform: translateX(-50%);
  width: 150px; height: 26px;
  background: radial-gradient(ellipse at center,
    rgba(60,40,15,0.16) 0%, rgba(60,40,15,0.06) 45%, transparent 72%);
  filter: blur(3px);
  z-index: 0;
}

/* ---------- status pill ---------- */
.homeb__status-wrap { text-align: center; }
.homeb__pill {
  margin: 28px auto 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  max-width: 320px;
  padding: 10px 18px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-honey);
  font-size: var(--text-body);
  line-height: 1.45;
  color: var(--color-text-primary);
  text-align: center;
  border: 1px solid transparent;
}
.homeb__pill-dot {
  width: 7px; height: 7px; border-radius: var(--radius-full);
  background: var(--color-mineral);
  flex-shrink: 0;
}
.homeb__pill--trial { background: var(--color-surface-honey); }
.homeb__pill--protected { background: var(--color-surface-warm); }
.homeb__pill--lapsed {
  /* muted-warm, never red — the "disabled/progress" surface reads as paused */
  background: var(--color-surface-warm);
  border-color: #DCD0BC;   /* one-off divider weight; --color-border is too faint here */
  flex-direction: column;
  gap: 2px;
}
.homeb__pill-main { color: var(--color-text-primary); font-weight: 500; }
.homeb__pill-sub {
  /* AA-safe supporting grey on the warm pill (-secondary dips below 4.5:1 here) */
  color: var(--color-text-secondary-strong);
  font-size: var(--text-small);
}

/* ---------- first-arrival line (visit #1 only) ---------- */
.homeb__first-line {
  margin: 22px auto 0;
  max-width: 300px;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
  font-size: var(--text-body-lg);
  line-height: 1.5;
  text-align: center;
  color: var(--color-text-primary);
}

/* ---------- primary CTA ---------- */
.homeb__cta-wrap { margin-top: var(--space-2xl); }
.homeb__cta {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 56px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-mineral-dark);   /* AA: white on -dark = 5.38:1 */
  color: #fff;
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-mineral);
  transition: background var(--duration-micro) var(--ease-press),
              transform var(--duration-micro) var(--ease-press);
}
.homeb__cta:hover { background: var(--color-mineral-darker); }
.homeb__cta:active { transform: translateY(1px); }
.homeb__cta:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 3px; }
/* shimmer sweep (free-tier / trial CTA only): twice on arrival, then rests */
.homeb__cta--shimmer::after {
  content: "";
  position: absolute;
  top: 0; left: -45%;
  width: 40%; height: 100%;
  background: linear-gradient(100deg,
    transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
  animation: hb-cta-shimmer 4500ms var(--ease-essence) 2;
}

/* ---------- archive preview ---------- */
.homeb__archive { margin-top: var(--space-3xl); }
.homeb__archive-head {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 14px;
}
.homeb__rows { display: flex; flex-direction: column; gap: 10px; }

.homeb__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--color-surface-card);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: box-shadow var(--duration-micro) var(--ease-essence),
              transform var(--duration-micro) var(--ease-essence);
  min-height: 44px;
  text-align: left;
  border: none;
  width: 100%;
  font-family: inherit;
}
.homeb__row:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.homeb__row:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }
.homeb__avatar {
  width: 40px; height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-surface-warm);
  color: var(--color-mineral-dark);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-small);
  font-weight: 600;
  flex-shrink: 0;
}
/* flex column so the recipient + meta stack (they're spans — a <button> can't
   contain block <div>s — so the column is what gives them their line break). */
.homeb__row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.homeb__row-recipient {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.homeb__row-meta {
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.homeb__chevron { color: var(--color-text-tertiary); font-size: 20px; flex-shrink: 0; }

/* 3/3 quiet-complete */
.homeb__complete { margin-top: 18px; text-align: center; }
.homeb__complete-line {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.5;
  color: var(--color-text-primary);
  max-width: 300px;
  margin: 0 auto;
}
.homeb__waitlist {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: var(--space-xs);
  padding: 0 var(--space-sm);
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.homeb__waitlist:hover { text-decoration: underline; text-underline-offset: 3px; }
.homeb__waitlist:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; border-radius: var(--radius-lg); }

/* tertiary shelf link */
.homeb__shelf-link-wrap { margin-top: 22px; text-align: center; }
.homeb__shelf-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 var(--space-sm);
  font-size: var(--text-ui);
  font-weight: 500;
  color: var(--color-mineral-dark);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.homeb__shelf-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.homeb__shelf-link:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; border-radius: var(--radius-lg); }

/* ---------- system overlays (loading / error) ---------- */
.homeb__system {
  position: absolute;
  inset: 0;
  background: var(--color-bg-neutral);
  z-index: 40;
  padding: var(--space-xl) var(--space-lg) 56px;
}
.homeb__system--loading { padding-top: 64px; }
.homeb__sk {
  background: linear-gradient(90deg,
    rgba(28,26,24,0.05) 0%, rgba(28,26,24,0.09) 50%, rgba(28,26,24,0.05) 100%);
  background-size: 220% 100%;
  border-radius: var(--radius-2xl);
  animation: hb-sk-shimmer 1600ms ease-in-out infinite;
}
.homeb__sk-stone { width: 184px; height: 184px; border-radius: var(--radius-full); margin: 0 auto; }
.homeb__sk-pill { width: 220px; height: 38px; border-radius: var(--radius-pill); margin: 30px auto 0; }
.homeb__sk-cta { width: 100%; height: 56px; border-radius: var(--radius-lg); margin-top: 34px; }
.homeb__sk-rows { margin-top: 42px; display: flex; flex-direction: column; gap: 10px; }
.homeb__sk-row { width: 100%; height: 68px; border-radius: var(--radius-2xl); }

.homeb__system--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.homeb__err-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}
.homeb__err-body {
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  max-width: 260px;
  line-height: 1.5;
  margin-bottom: 28px;
}
.homeb__retry {
  height: 48px;
  padding: 0 28px;
  border: 1px solid var(--color-mineral);
  background: none;
  border-radius: var(--radius-lg);
  color: var(--color-mineral-dark);
  font-family: var(--font-body);
  font-size: var(--text-ui);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-micro) var(--ease-essence);
}
.homeb__retry:hover { background: var(--color-surface-warm); }
.homeb__retry:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }

/* ---------- arrival stagger ---------- */
.homeb .arr { opacity: 1; }                 /* default resting (no flash) */
.homeb.is-playing .arr {
  animation: hb-arrive var(--hb-ad, 620ms) var(--ease-page) both;
}
.homeb.is-playing .arr1 { animation-delay: 80ms; }
.homeb.is-playing .arr2 { animation-delay: 150ms; }
.homeb.is-playing .arr3 { animation-delay: 220ms; }
.homeb.is-playing .arr4 { animation-delay: 300ms; }
/* first-arrival: heavier, slower, more spacing */
.homeb.is-playing.is-heavy { --hb-ad: 760ms; }
.homeb.is-playing.is-heavy .arr  { animation-delay: 120ms; }
.homeb.is-playing.is-heavy .arr1 { animation-delay: 360ms; }
.homeb.is-playing.is-heavy .arr2 { animation-delay: 520ms; }
.homeb.is-playing.is-heavy .arr3 { animation-delay: 700ms; }
.homeb.is-playing.is-heavy .arr4 { animation-delay: 880ms; }

/* ---------- motion keyframes ---------- */
@keyframes hb-cta-shimmer {
  0%   { left: -45%; }
  55%  { left: 130%; }
  100% { left: 130%; }   /* hold = rest gap between sweeps */
}
@keyframes hb-arrive {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hb-sk-shimmer {
  0%   { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

/* ---------- reduced motion: pin to a resting state, never mid-trough ---------- */
@media (prefers-reduced-motion: reduce) {
  .homeb { transition: none; }
  .homeb__cta--shimmer::after { animation: none; left: 130%; }
  .homeb__sk { animation: none; }
  .homeb.is-playing .arr { animation: none !important; opacity: 1; transform: none; }
}
`;
