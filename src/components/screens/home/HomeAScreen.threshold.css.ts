/**
 * Home A — Direction 2, "Threshold". Screen-scoped stylesheet under `.homea-th`,
 * the HomeBScreen.css.ts template-string convention.
 *
 * Design position: returning is the hero, not progress. The screen is left-aligned
 * and editorial where Home B is centred and ceremonial — a letter left open on a
 * desk rather than a status board. Progress collapses to one line of prose.
 *
 * Deliberately holding ONE hairline on the whole screen (the divider under the
 * standing line). A left-aligned serif plus a stack of hairline rules is the
 * broadsheet default; one functional rule that separates "where you are" from
 * "what's next" is structure, a set of them would be decoration.
 */
export const HOME_A_THRESHOLD_CSS = `
.homea-th {
  position: relative;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg) 56px;
  background: var(--color-bg-neutral);
  display: flex;
  flex-direction: column;
  transition: background 1500ms var(--ease-page);
}
.homea-th[data-ground="warm"] { background: var(--color-bg-warm-1); }

/* ---------- top bar ---------- */
.homea-th__topbar {
  display: flex; justify-content: flex-end; align-items: center;
  height: 44px;
}
.homea-th__settings {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  transition: color var(--duration-micro) var(--ease-essence);
  margin-right: -10px;
}
.homea-th__settings:hover { color: var(--color-text-primary); }
.homea-th__settings:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }

/* ---------- stone: small, left, marginal ---------- */
.homea-th__stone-wrap {
  position: relative;
  width: 96px; height: 96px;
  margin-top: var(--space-md);
  margin-left: -6px;      /* optical: the canvas glow pads the stone's edge */
  display: flex; align-items: center; justify-content: center;
}
.homea-th__stone-wrap::after {
  content: "";
  position: absolute;
  bottom: -2px; left: 50%;
  transform: translateX(-50%);
  width: 70px; height: 13px;
  background: radial-gradient(ellipse at center,
    rgba(40,44,50,0.12) 0%, rgba(40,44,50,0.05) 45%, transparent 72%);
  filter: blur(3px);
  z-index: 0;
}

/* ---------- the headline (the hero) ---------- */
.homea-th__title {
  margin: var(--space-xl) 0 0;
  font-family: var(--font-display);
  /* one step above the --text-title role: this is the only large element on the
     screen, and it carries what the stone carries on Home B. */
  font-size: var(--text-h2);
  line-height: 1.28;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--color-text-primary);
  max-width: 15ch;        /* forces the 2-3 line break that gives it its shape */
  text-wrap: balance;
}

/* ---------- the one progress line ---------- */
.homea-th__standing {
  margin: var(--space-lg) 0 0;
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 30ch;
}

/* ---------- the single hairline ---------- */
.homea-th__rule {
  height: 1px;
  margin: var(--space-2xl) 0 0;
  background: var(--color-hairline);
  transform-origin: left center;
}

/* ---------- what's waiting ---------- */
/* Serif, so it reads as the screen's second voice rather than more UI copy —
   but a step down from the headline. At body-lg it competed with the hero for
   the eye, and the skill's one-bold-element rule says the headline wins. */
.homea-th__ahead {
  margin: var(--space-xl) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-primary);
  max-width: 32ch;
}

/* ---------- actions ---------- */
.homea-th__cta-wrap { margin-top: var(--space-3xl); }
.homea-th__cta {
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
.homea-th__cta:hover { background: var(--color-mineral-darker); }
.homea-th__cta:active { transform: translateY(1px); }
.homea-th__cta:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 3px; }

.homea-th__link-wrap { margin-top: var(--space-2xl); }
.homea-th__link {
  display: inline-flex; align-items: center;
  min-height: 44px; padding: 0;
  font-family: inherit;
  font-size: var(--text-ui);
  font-weight: 500;
  color: var(--color-mineral-dark);
  background: none; border: none; cursor: pointer;
}
.homea-th__link:hover { text-decoration: underline; text-underline-offset: 3px; }
.homea-th__link:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; border-radius: var(--radius-lg); }

.homea-th__footer { margin-top: auto; padding-top: var(--space-3xl); }

/* ---------- arrival ----------
   THE signature moment, and the only one: the rule draws left-to-right once
   while the line beneath it settles in behind. No cascade over every block —
   a fade-and-slide on each section is the generic default. */
.homea-th .arr { opacity: 1; }
.homea-th.is-playing .arr {
  animation: hath-arrive 700ms var(--ease-page) both;
}
.homea-th.is-playing .arr1 { animation-delay: 90ms; }

.homea-th.is-playing .homea-th__rule {
  animation: hath-draw 620ms var(--ease-page) 320ms both;
}
.homea-th.is-playing .homea-th__ahead {
  animation: hath-settle 620ms var(--ease-page) 560ms both;
}

@keyframes hath-arrive {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hath-draw {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes hath-settle {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---------- reduced motion: collapse to the destination state ---------- */
@media (prefers-reduced-motion: reduce) {
  .homea-th { transition: none; }
  .homea-th.is-playing .arr { animation: none !important; opacity: 1; transform: none; }
  .homea-th.is-playing .homea-th__rule {
    animation: none !important; transform: scaleX(1);
  }
  .homea-th.is-playing .homea-th__ahead {
    animation: none !important; opacity: 1; transform: none;
  }
}
`;
