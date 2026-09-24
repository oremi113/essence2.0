/**
 * Home A — the retrofit's styles.
 *
 * Values here are not free. Each one survived a closed review thread on this
 * screen (docs/session-home-a/). The ones most likely to be "tidied" by
 * someone who wasn't there carry their argument inline.
 *
 * Thread 4's promotions (.essence-* patterns) land in globals.css with this
 * screen; the classes below consume them rather than restating them.
 *
 * NOTE: no backticks below — this is a template literal, and one inside a
 * CSS comment silently terminates it. Use single quotes.
 */
export const homeACss = `
.homea {
  position: relative;
  display: flex;
  flex-direction: column;
  /* BOUNDED, not just min-height. With min-height alone the container grows
     with its content, so on a short viewport the whole PAGE scrolls and the
     action block is not pinned at all — measured at 852px inside a 667px
     iPhone SE viewport, which put the primary CTA below the fold. The scroll
     region can only do its job if its parent is bounded to the viewport.
     dvh rather than vh so the mobile URL bar does not clip it. */
  height: 100dvh;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--color-bg-neutral);
  color: var(--color-text-primary);
  font-family: var(--font-body);
}

/* ── the scroll region ────────────────────────────────────────────────────
   Owner call 2. At 130% text with a banner present the column overflows by
   92px, and the two candidate fixes both gave up something this screen
   cannot: collapsing the banner hides "your messages are safe either way"
   from exactly the users most likely to need it, and scrolling the whole
   column puts the primary action below the fold on a screen whose entire job
   is one tap.
   So the content scrolls and the action block does not. At 100% nothing
   overflows and the block sits at the bottom exactly as it would anyway. */
.homea__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: var(--space-xl) var(--space-xl) 0;
}

/* A cue that there is more below, shown only when the region actually
   overflows. Without it the content simply stops mid-sentence — at the taller
   past-due variants the next-stop line gets cut by ~32px — and this audience
   reads a truncated sentence as broken rather than as scrollable. They will
   not swipe on a hunch.
   A fade rather than a chevron or a shadow: it keeps the ground unbroken (the
   band already sits on it), costs no layout, and is honest about the amount
   hidden rather than implying a control. 'mask-image' so it works on any
   ground colour and needs no matching gradient. */
.homea__scroll[data-overflow='true'] {
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%);
}
/* At the bottom there is nothing further to hint at, so the fade lifts. */
.homea__scroll[data-overflow='end'] {
  -webkit-mask-image: none;
  mask-image: none;
}

/* Full-bleed inside the 24px gutter. In flow, never absolute: an earlier pass
   positioned it absolutely against a hardcoded offset and it painted over the
   settings gear by 72px. In flow, overlap is structurally impossible and the
   taller variants need no magic number. */
/* The failed register centres its content vertically.
   It strips almost everything the other registers carry — no stone (a grey
   disc above an apology), no band, no next-stop line — so top-anchoring left a
   542px void against paused's 209px: 64% of the screen, empty. Whitespace
   reads as calm when you are relaxed and as malfunction when you are not, and
   this is the one screen where the user already suspects something broke.
   Only the vertical anchor changes. The shell, the left margin and the pinned
   action block are identical to the other registers, and thread 3's
   two-axes call was about horizontal alignment, which is untouched. */
.homea__body { display: flex; flex-direction: column; }
.homea[data-register='failed'] .homea__body {
  flex: 1 1 auto;
  justify-content: center;
}
/* Centring the whole scroll region instead was wrong twice over: it pulled the
   headline flush against the past-due banner (measured 0px between them, which
   is why the two read as one squashed block), and the gear had to be lifted out
   of flow to escape it, which put it behind a 375px banner. Only the register
   content centres; the banner and the gear stay in flow above it. */

.homea__banner + .homea__topbar { margin-top: var(--space-lg); }
/* Where there is no gear row between them — and to guarantee the gap even when
   the register content centres — the body keeps its own distance. */
.homea__banner ~ .homea__body { margin-top: var(--space-xl); }
.homea__banner { margin: calc(var(--space-xl) * -1) calc(var(--space-xl) * -1) 0; }

.homea__topbar { display: flex; justify-content: flex-end; align-items: center; }
.homea__settings {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--duration-micro) var(--ease-essence);
}
.homea__settings:hover { color: var(--color-text-primary); }
.homea__settings:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }

/* ── the stone ────────────────────────────────────────────────────────────
   40px above / 32px below. Canon asks 120px of air on every side, which is
   arithmetically impossible in a 390px column around a 140px stone —
   pretending otherwise is how an earlier pass ended up giving it 4px. The
   intent is honoured differently: it is the only centred object and carries
   the largest air on the screen.
   Absent in the failed register — an emotional anchor for a thing that is working is a
   grey disc above an apology. */
.homea__stone {
  display: flex; align-items: center; justify-content: center;
  margin: var(--space-3xl) 0 var(--space-2xl);
}

/* The stone yields space before the content does.
   As text grows the pinned action block grows with it and eats the scroll
   region — measured on WebKit at a 200% root, the region fell from 507px to
   402px while its content rose to 726px. The stone held 140px plus 72px of
   margin through all of that, so a decorative element (it is aria-hidden) kept
   half the space while the pill, the band and the next-stop line — the only
   information on the screen — scrolled out of sight.
   Height in 'em' is the right query here: em in a media query resolves against
   the user's own font size, so this fires when the viewport is short RELATIVE
   TO THEIR TEXT, which is the actual condition. A px height query cannot see
   it, because the viewport never changed.

   The thresholds are fitted, not picked. A 390x664 Safari viewport is already
   41.5em tall at default text, so an earlier 44em threshold shrank the stone
   for every iPhone user at normal size. The real ladder, at that viewport:
   100% -> 41.5em, 130% -> 31.9em, 160% -> 25.9em, 200% -> 20.8em. 36em
   therefore leaves default alone and engages from about 120% up; 24em is where
   there is nothing left worth trading. */
@media (max-height: 36em) {
  .homea__stone { margin: var(--space-lg) 0 var(--space-md); }
  .homea__stone canvas { width: 96px !important; height: 96px !important; }
}
@media (max-height: 24em) {
  /* Nothing left worth trading: the stone goes so the progress can stay. */
  .homea__stone { display: none; }
}

/* ── register content ─────────────────────────────────────────────────────
   Left-aligned on one margin; the stone is the only centred object. Mixing
   axes looked accidental when the stone had no air, not because of the axis. */
.homea__headline {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
}
.homea__sub {
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-text-secondary-strong);
  margin: var(--space-md) 0 0;
  text-wrap: pretty;
}

/* The count is metadata, not a headline. It was 28px Spectral and read as a
   scoreboard — the one thing the brief was written to remove. */
.homea__pill { align-self: flex-start; }

.homea__band { margin-top: var(--space-2xl); }
.homea__band-labels {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md);
  margin-bottom: var(--space-sm);
}
.homea__band-label {
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  /* Grid children default to min-width:auto, so a word wider than its column
     pushes the whole row past the viewport instead of wrapping. min-width:0
     lets the column actually be as narrow as it claims.

     For the break itself: NOT overflow-wrap:anywhere. That was the first fix
     and it cut words at whatever character happened to land at the edge —
     'Emoti/onal', 'Every/day'. It removed the overflow and replaced it with
     something harder to read, which on a screen for 45-to-70-year-olds is the
     wrong trade. hyphens:auto breaks at syllables and marks the break with a
     hyphen; break-word only cuts mid-word when nothing else is possible. */
  min-width: 0;
  hyphens: auto;
  overflow-wrap: break-word;
}

/* The highest-value line on the screen: it narrates the 12-prompt middle so
   the band doesn't have to. On the ground, never on a card — the CTA is the
   only weighted element. Upright, never italic: a count is functional
   microcopy. */
.homea__next-stop {
  margin: var(--space-2xl) 0 0;
  font-size: var(--text-body-lg);
  line-height: 1.5;
  color: var(--color-text-primary);
  text-wrap: pretty;
}

/* ── the pinned action block ──────────────────────────────────────────────
   Does not scroll. What pins is whichever of three things the register holds:
   a primary, or — in the waiting sub-state — when to come back. */
.homea__action {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: var(--space-2xl) var(--space-xl);
}

.homea__cta {
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
}
.homea__cta:hover { background: var(--color-mineral-darker); }
.homea__cta:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 3px; }

/* A primary that cannot currently work. Not a disabled mineral button — that
   was never specified and reads as a broken primary. The *reason* lives in
   the banner; if the button explained itself too they would be two treatments
   to keep in sync. */
.homea__cta--unavailable {
  background: var(--color-surface-warm);
  color: var(--color-text-secondary-strong);
  box-shadow: none;
  cursor: default;
}
.homea__cta--unavailable:hover { background: var(--color-surface-warm); }

.homea__reassurance {
  margin-top: var(--space-lg);
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-text-secondary-strong);
}
.homea__cta-note {
  margin-top: var(--space-md);
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-text-secondary-strong);
}

/* No large-text override lives here, deliberately. An earlier version carried
   '.homea--large-text { font-size: 130% }' so a harness toggle could simulate
   dynamic type. It did nothing: every size in this screen is a px token, so
   raising the root changed no child. Measured — root went 16px to 20.8px while
   the CTA and the next-stop line both stayed at 18px.
   That is FOLLOW_UPS #106, not a bug in this screen: the app's type scale is px
   throughout, so it does not respond to a text-size preference anywhere. A
   control that appears to test it and cannot is worse than no control, because
   it manufactures a passing result. Verify with real browser zoom instead. */

/* Banner slot contents. The slot itself is .essence-banner-slot; these are the
   two text roles inside it, shared by the offline and past-due fills. */
.homea__banner-title {
  font-size: var(--text-ui);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}
.homea__banner-body {
  margin-top: var(--space-xs);
  font-size: var(--text-small);
  line-height: 1.4;
  color: var(--color-text-secondary-strong);
}

/* The wait block — what pins when no control can work. Same surface and radius
   as the card, so it holds the action block's position and visual weight; what
   pins is *when to come back* rather than a button. */
.homea__wait-title {
  font-size: var(--text-body);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}
.homea__wait-body {
  margin-top: var(--space-xs);
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-text-secondary-strong);
}
`;
