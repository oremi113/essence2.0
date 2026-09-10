/**
 * Step 5 · First Playback — screen-scoped stylesheet, injected via
 * <style>{FIRST_PLAYBACK_CSS}</style> under `.fpb`, the same template-string
 * convention as HomeBScreen.css.ts / HomeAScreen.strata.css.ts.
 *
 * Ported from `prototypes/essence-step5-first-playback.html`. The atmosphere
 * stack and the cream-on-ink ramp are specified in `prototypes/ds/dark-stage.html`
 * and tokenised in globals.css @theme § DARK CEREMONIAL STAGE; every colour here
 * resolves to a token. The composition literals — `opacity: .14 + lum × .86` and
 * friends — stay inline on purpose: they are a composition, not a palette, and
 * tokenising the arithmetic would name it without making it reusable.
 *
 * Everything animated is `opacity` or `transform`, driven by two custom
 * properties from one rAF loop. No layout, no paint on the critical path.
 */
export const FIRST_PLAYBACK_CSS = `
.fpb {
  position: relative;
  /* NOT plain 100dvh — inside the app shell that overflows by the shell's 40px
     bottom padding and puts a phantom scroll on a screen meant to be one still
     frame. See docs/follow-ups/2026-09-04-full-height-screens-overflow-the-app-shell-padding.md */
  min-height: calc(100dvh - var(--app-main-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  padding: 60px 30px 40px;
  background: var(--color-ink);
  color: var(--color-on-dark);
  overflow: hidden;
  --lum: 0;
  --sus: 0;
  /* keeps the screen/overlay blends off the page behind this screen */
  isolation: isolate;
}

/* ---------- atmosphere: six layers, painted back to front ---------- */

.fpb__atmos { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

/* Warm-ink ground, anchored on --color-ink rather than a darker invention. */
.fpb__l-base {
  position: absolute; inset: 0;
  background: radial-gradient(130% 78% at 50% 34%,
    var(--color-ink-lift) 0%, var(--color-ink) 45%, #171512 78%, var(--color-ink-deep) 100%);
}
/* The stone lighting its room. Without this the stone is a sticker. */
.fpb__l-cast {
  position: absolute; inset: 0;
  background: radial-gradient(58% 38% at 50% 36%,
    rgba(255,230,180,.30), rgba(255,230,180,.10) 45%, transparent 72%);
  opacity: calc(.14 + var(--lum) * .86);
  mix-blend-mode: screen;
}
/* Ambient bloom — light thrown into the air below the stone. NOT a ground
   plane: no floor exists on this screen. Closed at 52% so it dies above the
   first line's cap height, and the line brightens with the words, not the room. */
.fpb__l-bloom {
  position: absolute; left: 50%; top: 100%;
  width: 400px; height: 110px;
  transform: translate(-50%, -30%);
  background: radial-gradient(ellipse at center, rgba(255,230,180,.24), transparent 52%);
  filter: blur(18px);
  opacity: calc(.32 + var(--lum) * .55);
  mix-blend-mode: screen;
}
/* Contact shadow. Widens as the stone brightens — closer to its floor when
   louder. The one dark layer in the stack. */
.fpb__l-contact {
  position: absolute; left: 50%; top: 100%;
  width: 214px; height: 32px;
  transform: translate(-50%, -42%) scaleX(calc(1 + var(--lum) * .10));
  background: radial-gradient(ellipse at center, rgba(0,0,0,.62), transparent 70%);
  filter: blur(9px);
}
/* Vignette. Static — holds the eye at 40% height, which is where the stone is. */
.fpb__l-vig {
  position: absolute; inset: 0;
  background: radial-gradient(88% 62% at 50% 40%,
    transparent 42%, rgba(0,0,0,.42) 82%, rgba(0,0,0,.66) 100%);
}
/* Grain. Kills the gradient banding that makes dark screens read cheap.
   inset: 0 is load-bearing: at inset:-50% this never-animating layer was 1.32M
   overlay-blended pixels and cost more than every promoted layer combined. */
.fpb__l-grain {
  position: absolute; inset: 0;
  opacity: .055;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ---------- stone ---------- */

/* Crush guard: .fpb__stage is flex:1;min-height:0, so any growth below would
   silently crush the stone into the lede instead of failing loudly.
   246 = 220 stone + 26 padding. */
.fpb__stage {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  position: relative; z-index: 1;
  min-height: 246px;
  padding-bottom: 26px;
}
/* The entry offset composes with the sustain scale rather than replacing it, so
   the inbound crossfade and the speech follower never fight over transform.
   Defaults are identity, so a screen mounted without an entrance is unaffected. */
.fpb__stone-wrap {
  flex: none;
  position: relative;
  width: 220px; height: 220px;
  display: flex; align-items: center; justify-content: center;
  transform:
    translate(var(--fpb-entry-dx, 0px), var(--fpb-entry-dy, 0px))
    scale(calc((1 + var(--sus) * .045) * var(--fpb-entry-scale, 1)));
}

/* The stone must NOT re-enter. It arrives already occupying the outgoing
   ceremony stone's exact rect, so the cross-dissolve happens in place and
   invisibly; only then does it travel to where this screen wants it.

   The travel itself is driven by the Web Animations API in the component, not
   from here: the resting transform is composed from custom properties, and a
   var() change does not reliably start a CSS transition. What remains here is
   only what the entrance should SUPPRESS. */
.fpb[data-entering="true"] .fpb__l-bloom,
.fpb[data-entering="true"] .fpb__l-contact {
  opacity: 0;
  transition: opacity var(--fpb-entry-ms, 700ms) var(--ease-page);
}
/* Two-speed halo, both on --stone-halo. Near tracks amplitude; far lags — the
   light leaves the stone slower than the sound does. */
.fpb__aura-far {
  position: absolute; inset: -46%; border-radius: 999px;
  background: radial-gradient(circle, var(--stone-halo), rgba(255,230,180,.05) 42%, transparent 66%);
  opacity: calc(.30 + var(--lum) * .70);
  transform: scale(calc(1 + var(--lum) * .13));
}
.fpb__aura-near {
  position: absolute; inset: -15%; border-radius: 999px;
  background: radial-gradient(circle, var(--stone-halo), transparent 60%);
  opacity: calc(.45 + var(--lum) * .55);
  transform: scale(calc(1 + var(--lum) * .12));
}
/* Body gradient + all three shadows verbatim from ds/breath-stone.html. The
   shadows are held STATIC — driving box-shadow per frame repaints; the aura
   layers carry the glow on opacity/transform instead. */
.fpb__stone {
  width: 100%; height: 100%; border-radius: 999px; position: relative;
  background: radial-gradient(circle at 30% 28%,
    #FFFBF1 0%, #F0E5CE 25%, #C9B68B 55%, #6E5B3A 85%, #2A2216 100%);
  box-shadow:
    0 0 80px 20px rgba(247,230,181,.15),
    inset -20px -30px 60px rgba(50,38,20,.4),
    inset 20px 20px 40px rgba(255,255,240,.25),
    0 24px 48px rgba(0,0,0,.45);
}
/* Subsurface: the voice is IN the stone, not on it. */
.fpb__stone-sub {
  position: absolute; inset: 9%; border-radius: 999px;
  background: radial-gradient(circle at 48% 58%,
    rgba(255,230,180,.9), rgba(255,214,150,.32) 44%, transparent 70%);
  filter: blur(16px);
  mix-blend-mode: screen;
  opacity: calc(.06 + var(--lum) * .72);
}
.fpb__rim {
  position: absolute; inset: 0; border-radius: 999px;
  background: radial-gradient(circle at 71% 77%, rgba(255,230,180,.5), transparent 40%);
  mix-blend-mode: screen;
  opacity: calc(.22 + var(--lum) * .34);
}
.fpb__spec {
  position: absolute; top: 15%; left: 22%; width: 30%; height: 20%;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(255,255,255,.55), transparent 70%);
  filter: blur(6px);
}

@keyframes fpbBreath {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}
@keyframes fpbHaloBreath {
  0%, 100% { opacity: .45; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.12); }
}
.fpb__stone-wrap[data-breathing="true"] .fpb__stone,
.fpb__stone-wrap[data-breathing="true"] .fpb__aura-near,
.fpb__stone-wrap[data-breathing="true"] .fpb__aura-far {
  animation: fpbBreath var(--duration-breath) var(--ease-breath) infinite;
}
.fpb__stone-wrap[data-breathing="true"] .fpb__aura-near,
.fpb__stone-wrap[data-breathing="true"] .fpb__aura-far {
  animation-name: fpbHaloBreath;
}

/* will-change is a STATE, not a declaration: zero promoted layers at rest,
   eight for the ~5s of the utterance. The exposure here is GPU layer memory,
   not main-thread cost — the choreography is compositor-bound by design. */
.fpb[data-speaking="true"] .fpb__l-cast,
.fpb[data-speaking="true"] .fpb__l-bloom,
.fpb[data-speaking="true"] .fpb__stone-sub,
.fpb[data-speaking="true"] .fpb__rim { will-change: opacity; }
.fpb[data-speaking="true"] .fpb__l-contact,
.fpb[data-speaking="true"] .fpb__stone-wrap { will-change: transform; }
.fpb[data-speaking="true"] .fpb__aura-far,
.fpb[data-speaking="true"] .fpb__aura-near { will-change: transform, opacity; }

/* ---------- copy ---------- */

.fpb__top {
  min-height: 82px; z-index: 1;
  display: flex; flex-direction: column; align-items: center;
  justify-content: flex-start; gap: 11px;
}
.fpb__eyebrow {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--on-dark-muted);
  opacity: 0;
  transition: opacity 1200ms var(--ease-essence);
}
.fpb__lede {
  margin: 0;
  display: flex; flex-direction: column;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  line-height: 1.45;
  text-align: center;
  color: var(--on-dark-recede);
}
.fpb__lede span {
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 1300ms var(--ease-essence), transform 1300ms var(--ease-page);
}

.fpb__bottom {
  min-height: 368px; z-index: 1;
  container-type: inline-size;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
}
.fpb__spoken-wrap { opacity: 0; transition: opacity 1200ms var(--ease-essence); }

/* The measure is px, not ch. A font-relative measure rags identically at every
   size, so the fit step could never buy a line back — 255px is the width 15ch
   produced at the tuned size. Container units, not vw: a 390px frame inside a
   desktop review page would otherwise size the line to the browser. */
.fpb__spoken {
  margin: 0;
  max-width: 255px;
  font-family: var(--font-display);
  font-size: clamp(26px, 10.30cqw, var(--text-display));
  font-weight: 400;
  line-height: var(--line-height-display);
  letter-spacing: var(--tracking-display);
  text-align: center;
  text-wrap: pretty;
}
.fpb__w {
  display: inline-block;
  opacity: .13;
  color: var(--color-on-dark);
  filter: blur(4px);
  transform: translateY(4px);
  transition:
    opacity 620ms var(--ease-essence),
    filter 620ms var(--ease-essence),
    transform 620ms var(--ease-page),
    color 900ms var(--ease-essence),
    text-shadow 900ms var(--ease-essence);
}
.fpb__w[data-lit="true"] {
  opacity: 1;
  filter: blur(0);
  transform: none;
  color: #FFF6E4;
  text-shadow: 0 0 26px rgba(255,230,180,.42);
}
/* Per-word decay: each word settles on its own beat, so the line cools in the
   order it was spoken instead of flipping state in one global switch. */
.fpb__w[data-rest="true"] {
  color: #EFE7D6;
  text-shadow: 0 0 0 rgba(255,230,180,0);
  opacity: .9;
}

.fpb__after { margin-top: 26px; text-align: center; }
.fpb__after > * {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 1200ms var(--ease-essence), transform 1200ms var(--ease-page);
}
.fpb__payoff {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-ceremonial);
  font-weight: 600;
  letter-spacing: var(--tracking-ceremonial);
  color: var(--on-dark-strong);
}
/* Spectral italic, not Inter. This slot also hosts non-happy notices at 15px
   Inter, and the FAMILY is the only signal separating them — the aside is the
   moment speaking, a notice is the product speaking. Never separate them by
   colour or size alone. */
.fpb__aside {
  margin: 7px 0 0;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  line-height: 1.5;
  color: var(--on-dark-muted);
}

.fpb [data-show="true"] { opacity: 1; transform: none; }

/* ---------- actions ---------- */

/* align-self: stretch before width:100% will bind — a flex column child does
   not inherit its parent's width, and without this the "full-width" CTA renders
   at its content width: correct-looking, wrong. */
.fpb__actions {
  align-self: stretch;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding-top: 24px;
  min-height: 112px;
  z-index: 1;
}
.fpb__btn {
  font-family: var(--font-body);
  font-size: 17px; font-weight: 600; letter-spacing: .005em;
  width: 100%; max-width: 330px; min-height: 52px; padding: 0 32px;
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer;
  background: var(--color-primary-dark);
  color: var(--color-on-primary-dark);
  box-shadow: var(--shadow-honey);
  transition:
    background var(--duration-small) var(--ease-essence),
    transform var(--duration-small) var(--ease-essence),
    box-shadow var(--duration-small) var(--ease-essence);
}
.fpb__btn:hover { background: var(--color-primary-dark-hover); box-shadow: 0 12px 34px rgba(255,230,180,.2); }
.fpb__btn:active { transform: scale(.98); }
/* Mineral is near-invisible on warm ink and appears nowhere on a dark stage. */
.fpb__btn:focus-visible,
.fpb__btn--quiet:focus-visible { outline: 2px solid var(--focus-dark); outline-offset: 3px; }
.fpb__btn--quiet {
  width: auto; min-height: 44px; padding: 0 12px;
  background: transparent; box-shadow: none;
  color: var(--on-dark-body);
  font-weight: 500; font-size: var(--text-ui);
}
.fpb__btn--quiet:hover { background: transparent; box-shadow: none; color: rgba(247,241,228,.85); }
.fpb__btn--quiet[aria-disabled="true"] .fpb__replay { opacity: .38; transition: opacity var(--duration-micro) var(--ease-essence); }

/* An entrance is an ANIMATION, not a transition. A 1400ms transform transition
   for the rise would also govern :active, and the press stops being tactile —
   the button simply feels dead and nobody can say why. */
@keyframes fpbRise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.fpb__action-enter { animation: fpbRise 1400ms var(--ease-page) both; }

.fpb__replay { display: flex; align-items: center; gap: 7px; }
.fpb__replay svg { width: 14px; height: 14px; flex: none; }

.fpb__sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ---------- reduced motion ---------- */
/* Restricts movement, not luminance: --lum still steps per word, the layers
   cross-fade at --duration-micro, and --sus is held at 0 so nothing scales.
   No bulb held at 50% for the length of the utterance. */

.fpb[data-reduced="true"] .fpb__stone,
.fpb[data-reduced="true"] .fpb__aura-near,
.fpb[data-reduced="true"] .fpb__aura-far { animation: none; }
.fpb[data-reduced="true"] .fpb__stone-wrap { transform: none; }
.fpb[data-reduced="true"] .fpb__aura-far,
.fpb[data-reduced="true"] .fpb__aura-near { transform: none; }
.fpb[data-reduced="true"] .fpb__l-contact { transform: translate(-50%, -42%); }
.fpb[data-reduced="true"] .fpb__l-cast,
.fpb[data-reduced="true"] .fpb__l-bloom,
.fpb[data-reduced="true"] .fpb__stone-sub,
.fpb[data-reduced="true"] .fpb__rim,
.fpb[data-reduced="true"] .fpb__aura-far,
.fpb[data-reduced="true"] .fpb__aura-near {
  transition: opacity var(--duration-micro) var(--ease-essence);
}
.fpb[data-reduced="true"] .fpb__w { filter: none; transform: none; transition-duration: var(--duration-micro); }
.fpb[data-reduced="true"] .fpb__lede span { transform: none; }
.fpb[data-reduced="true"] .fpb__lede span,
.fpb[data-reduced="true"] .fpb__after > *,
.fpb[data-reduced="true"] .fpb__eyebrow,
.fpb[data-reduced="true"] .fpb__spoken-wrap { transition-duration: var(--duration-micro); }
.fpb[data-reduced="true"] .fpb__action-enter { animation-duration: var(--duration-micro); }
`;
