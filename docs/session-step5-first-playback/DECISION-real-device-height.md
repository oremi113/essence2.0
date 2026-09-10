# Decision memo — First Playback on a real phone

**Date:** 2026-09-10 · **Owner approved:** yes ("i think its good as-is")
**Supersedes, in part:** `prototypes/essence-step5-first-playback.html` layout
constants, and one ruling in `prototypes/ds/dark-stage.html`.

Production diverges from the prototype here. Per CLAUDE.md the prototype is
wrong only by explicit decision memo — this is that memo.

## What the owner found

Walking `/dev/first-playback` on an iPhone 16 Pro in Safari:

1. The second lede line sat **on top of the sphere**.
2. The page **could not be scrolled** — the payoff and the CTA were below the
   fold and unreachable.

Neither was visible in any automated check, because every measurement had been
taken at the prototype's 390×844 frame.

## Root cause

**The prototype assumes 844px of usable height. No mobile browser gives that.**
Real Safari spends roughly 130px on its own chrome, leaving ~700px on a 16 Pro.
The prototype's own notes say "Screen total 796 of 844" — 48px of slack at 844,
and ~96px of overflow at 700.

Two implementation faults compounded it:

- `overflow: hidden` on the screen root meant the excess was **clipped, not
  scrollable** — content the user could not reach by any means.
- The lede block was a default flex child (`0 1 auto`), so a short viewport
  shrank it **below its own content height**, pushing line two onto the stone.

## What production now does differently

| | Prototype | Production |
|---|---|---|
| Stone | fixed 220px | `clamp(132px, 20dvh, 220px)`; `clamp(160px, 27dvh, 220px)` when compact |
| Clearance above the stone | fixed | `stone × 0.15 + clamp(12px, 2dvh, 20px)` |
| Lede | always shown | **cut below 800px viewport height** |
| Root overflow | `hidden` | `auto` — scroll is a fallback, never the intent |
| Reserved text block | fixed 368px | `min(368px, 50dvh)`, content always wins |
| Primary max-width | 330px | **296px** |

**At 390×844 nothing changes.** The prototype remains authoritative for the
design frame; these rules only engage below it.

### Why clearance is proportional, not fixed

`.fpb__aura-near` glows to `inset: -15%`, so it extends beyond the stone's box.
A fixed gap left the *boxes* 22px apart while the *visible glow* had 1px — which
is what the owner was seeing. Clearance has to scale with the stone.

### Why the lede is cut rather than everything shrunk

The first fix shrank the stone to 140px to make room. The owner's response:
*"the sphere is now undersized."* Correct — 140px is barely above the design
system's 120px "reads as a dot, not a sphere" floor, and the sphere **is** the
beat.

`ds/dark-stage.html` already prescribes the alternative: *"If a design needs a
fifth level of cream, it has too much on the stage. Cut an element instead of
inventing an opacity."* The same logic applies to height. The lede is the only
block with slack (82px), and cutting it returns the stone to 189px.

The cost is real: *"Twenty-five moments. / This is what they became."* names the
investment before the proof arrives. On a small phone the beat runs eyebrow →
stone → voice → recognition instead. The core beat is untouched.

### Why a media query and not a measurement

Decided in CSS at `max-height: 799px`, not in JavaScript at mount:

- A `useState` initializer runs during **server rendering**, where there is no
  `window`, and React keeps that value through hydration — the check silently
  never fired. Moving it to an effect would have jumped the stone on frame one.
- 799px sits **above both of Safari's toolbar states** on every current iPhone
  (16 Pro is 700 / 790, both compact; 16 Pro Max is 830 / 920, neither), so the
  lede cannot pop in and out as the toolbar collapses.
- It is self-limiting anyway: compact mode is sized to fit, so there is no
  scroll to collapse the toolbar with.

## Amendment to a settled ruling — the full-width primary

`ds/dark-stage.html` closed this: *"Full-width primary on a dark ceremonial
stage: confirmed correct… the dark stage gives the button no container to sit
inside, so width is the only property left that reads as authority. A centred
auto-width button on ink reads as a link that gained a background."*

**The ruling stands. Its number changes: 330px → 296px.**

At 330 against a 255px ceremonial measure, the primary was the widest and
heaviest object on the stage — it out-weighed the stone it is meant to follow.
The ruling guards against a primary that reads as a *link with a background*; it
does not license one that dominates the hero. At 296 it is still unmistakably a
full-width primary, and the label does not wrap (verified).

## Known residual

**A 15/14-class screen (664px) overflows by 10px** and scrolls that far. The CTA
and the replay are both fully on screen; what is below the fold is padding.
Closing it would mean taking the stone to ~175px, trading the target device's
hero size for 10px elsewhere. Left as-is deliberately.

**An SE-class screen (560px) scrolls properly.** 560px cannot hold this
composition without shrinking the ceremonial type past where it reads as
ceremonial. Scrolling is the honest outcome; the alternative is cutting a second
element, which is a further design decision and not taken here.

## Follow-on

The prototype should be updated to carry these rules, or it will keep teaching
the 844 assumption to the next screen built from it. Not done in this pass — the
prototype is the owner's artifact.
