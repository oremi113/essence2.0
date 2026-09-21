/**
 * Home A — Direction 1, "Strata". Screen-scoped stylesheet, injected via
 * <style>{HOME_A_STRATA_CSS}</style> under `.homea-st`, the same template-string
 * convention as HomeBScreen.css.ts / SaveConfirmationScreen.css.
 *
 * Design position: the accumulated work is the hero. The 25 marks are laid on
 * the ground with no card and no shadow — deliberately NOT the surface-card kit,
 * so the CTA is the only element carrying weight on the screen.
 *
 * Colors/sizes resolve to globals.css @theme tokens. The two flagged one-offs
 * are documented inline; everything else is a token.
 */
export const HOME_A_STRATA_CSS = `
.homea-st {
  position: relative;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg) 56px;
  background: var(--color-bg-neutral);
  display: flex;
  flex-direction: column;
  /* rhymes with Home B's arrival settle, one shade cooler: Home A opens on the
     step-above-neutral cream, never the ceremonial rich ground (that warmth is
     Home B's payoff and isn't spent early). */
  transition: background 1500ms var(--ease-page);
}
.homea-st[data-ground="warm"] { background: var(--color-bg-warm-1); }

/* ---------- top bar ---------- */
.homea-st__topbar {
  display: flex; justify-content: flex-end; align-items: center;
  height: 44px; margin-bottom: var(--space-sm);
}
.homea-st__settings {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  transition: color var(--duration-micro) var(--ease-essence);
  margin-right: -10px;
}
.homea-st__settings:hover { color: var(--color-text-primary); }
.homea-st__settings:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }

/* ---------- stone (subordinate: 140 vs Home B's 200) ---------- */
.homea-st__stone-section {
  display: flex; flex-direction: column; align-items: center;
  padding-top: var(--space-md);
}
.homea-st__stone-wrap {
  position: relative;
  width: 140px; height: 140px;
  display: flex; align-items: center; justify-content: center;
}
/* ground shadow, scaled to the smaller stone; cooler + fainter than Home B's
   warm cast, matching the cool idle/working stone above it. */
.homea-st__stone-wrap::after {
  content: "";
  position: absolute;
  bottom: -4px; left: 50%;
  transform: translateX(-50%);
  width: 104px; height: 18px;
  background: radial-gradient(ellipse at center,
    rgba(40,44,50,0.13) 0%, rgba(40,44,50,0.05) 45%, transparent 72%);
  filter: blur(3px);
  z-index: 0;
}

/* ---------- headline ---------- */
.homea-st__head { text-align: center; margin-top: var(--space-xl); }
.homea-st__title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  line-height: var(--line-height-title);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}
.homea-st__sub {
  margin: var(--space-md) auto 0;
  max-width: 300px;
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--color-text-secondary);
}

/* ---------- the strata band (the hero) ---------- */
.homea-st__strata { margin-top: var(--space-3xl); }
.homea-st__marks {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
}
/* the seam: a wider gap at the two real stage boundaries (after 5, after 17).
   Structure encoding content — the only thing that tells you the script has
   three movements, with no labels added to say so. */
.homea-st__seam { width: 10px; flex-shrink: 0; }

/* Every mark is the same height. An earlier pass gave the recorded ones extra
   height, which turned the band into a bar chart of itself — a silhouette that
   read as an equalizer, exactly the audio cliché this screen should avoid.
   Uniform height and a fill difference reads as marks made in a tally: a record
   of moments, not a measurement of them. */
.homea-st__mark {
  width: 5px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--color-surface-warm);
  flex-shrink: 0;
  transform-origin: center;
}
.homea-st__mark--done {
  background: var(--color-mineral);
}
/* the mark you'll record next: a held place, not a filled one. */
.homea-st__mark--next {
  background: var(--color-mineral);
  opacity: 0.3;
}

.homea-st__stage-line {
  margin-top: var(--space-lg);
  text-align: center;
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* ---------- CTA (the only element with weight) ---------- */
.homea-st__cta-wrap { margin-top: var(--space-3xl); }
.homea-st__cta {
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
.homea-st__cta:hover { background: var(--color-mineral-darker); }
.homea-st__cta:active { transform: translateY(1px); }
.homea-st__cta:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 3px; }

/* quiet text action for the building state */
.homea-st__link-wrap { margin-top: var(--space-2xl); text-align: center; }
.homea-st__link {
  display: inline-flex; align-items: center;
  min-height: 44px; padding: 0 var(--space-sm);
  font-family: inherit;
  font-size: var(--text-ui);
  font-weight: 500;
  color: var(--color-mineral-dark);
  background: none; border: none; cursor: pointer;
}
.homea-st__link:hover { text-decoration: underline; text-underline-offset: 3px; }
.homea-st__link:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; border-radius: var(--radius-lg); }

.homea-st__footer { margin-top: auto; padding-top: var(--space-3xl); text-align: center; }

/* ---------- arrival ---------- */
.homea-st .arr { opacity: 1; }
.homea-st.is-playing .arr {
  animation: hast-arrive 620ms var(--ease-page) both;
}
.homea-st.is-playing .arr1 { animation-delay: 80ms; }
.homea-st.is-playing .arr2 { animation-delay: 160ms; }
.homea-st.is-playing .arr3 { animation-delay: 240ms; }

/* THE signature moment: the recorded marks ink in left-to-right, once, then
   rest. Per-mark delay is set inline from the index. Everything else on the
   screen is still — one orchestrated beat, not scattered effects. */
.homea-st.is-playing .homea-st__mark--done {
  animation: hast-ink 460ms var(--ease-page) both;
}
.homea-st.is-playing .homea-st__mark--next {
  animation: hast-hold 520ms var(--ease-essence) both;
}

@keyframes hast-arrive {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hast-ink {
  from { opacity: 0; transform: scaleY(0.3); }
  to   { opacity: 1; transform: scaleY(1); }
}
@keyframes hast-hold {
  from { opacity: 0; }
  to   { opacity: 0.3; }
}

/* ---------- reduced motion: collapse to the destination state ---------- */
@media (prefers-reduced-motion: reduce) {
  .homea-st { transition: none; }
  .homea-st.is-playing .arr { animation: none !important; opacity: 1; transform: none; }
  .homea-st.is-playing .homea-st__mark--done {
    animation: none !important; opacity: 1; transform: none;
  }
  .homea-st.is-playing .homea-st__mark--next {
    animation: none !important; opacity: 0.3;
  }
}
`;
