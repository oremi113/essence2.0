---
id: 2026-09-15-the-match-cut-scales-the-canvas-box-not-the-stone
priority: P2
status: resolved
opened: 2026-09-15
resolved: 2026-09-15
summary: "The `detail → playback` match cut hands over the ceremony stone's CANVAS rect, but the canvas only fills 56% of its own box with the sphere — so the hero object jumps 108px → 195px in a single frame at the ceremony's most ceremonial moment *(found capturing the cut at 4× throttle, 2026-09-15)*"
---

# The match cut is not a match cut

*(found capturing the real cut frame-by-frame at 4× throttle, 390×844)*

`src/components/screens/first-playback/FirstPlaybackScreen.tsx:462-464` ·
`src/components/screens/FirstBreathSequence.tsx` (`handleContinue`)

`FirstBreathSequence.tsx` states the intent plainly, and it is the right
intent:

> *"The two stones are geometrically identical at the moment of the tap, which
> is the definition of a match cut: swap in one frame with the hero object in
> the same place at the same size."*

They are not geometrically identical. Measured off the captured frames:

| | |
|---|---|
| last ceremony frame — sphere | **108px** |
| first playback frame — sphere | **195px** |
| | **1.8×, in one frame** |

## Root cause

The handoff measures the ceremony stone's **canvas element**:

```js
// FirstPlaybackScreen.tsx:464
const scale = entranceFrom.width / own.width;
```

`entranceFrom.width` is `stoneWrapperRef`'s rect — the 200px canvas. `own.width`
is `.fpb__stone-wrap`, 168.8px. So the incoming stone mounts at `200 / 168.8 =
1.185`, and since `.fpb__stone` is `width: 100%` of its wrapper, its **sphere**
arrives 200px across.

But the canvas is not full of stone. The engine draws at
`baseRadius = min(W, H) * 0.28`, so a 200px canvas holds a **112px** sphere and
44px of transparent margin on each side, which exists to give the bloom and
haze somewhere to go.

**The two rects match. The two spheres do not, by a factor of 1.79.** Both
numbers are "200", which is almost certainly why this survived review — the
mismatch is invisible in the code and only shows up if you measure pixels.

The direction is the unhelpful one, too: the stone arrives nearly double size
and *shrinks* into place over the travel, so the first thing the eye gets at the
payoff beat is the hero object lurching outward.

## Why it matters

This is the ceremony's single hero object at the moment the product is trying
to land. `ds/dark-stage.html` sets the rule for this boundary — **the stone
must not re-enter** — and a 1.8× pop is a re-entrance in all but name. It is
also the beat that `2026-09-10-two-stone-renderers-meet-at-the-playback-cut`
has been treating as a *material* problem; with the material now matched to
within 13 levels, this is what is actually wrong at the seam.

## Fix shape

Hand over the **sphere**, not the canvas box. Two parts:

1. `BreathStone` should expose the sphere's fraction of its canvas rather than
   leaving callers to know it. The engine's `0.28` is currently private, and
   `FirstBreathSequence` cannot compute the sphere rect without duplicating it.
   Export it (`BREATH_STONE_SPHERE_RATIO = 0.56` of the box, i.e. `0.28 * 2`)
   next to the component.
2. `handleContinue` then passes the sphere rect — same centre, width
   `rect.width * RATIO` — so `scale` comes out `112 / 168.8 = 0.664` and the
   stone arrives slightly *smaller* and settles outward, or exactly matched if
   `--fpb-stone` is chosen to suit.

Verify by re-running the capture: the sphere width across the swap frame should
change by a few px (breath phase), not by 87.

Worth checking the same mistake elsewhere — see
`2026-09-15-detail-glimmer-disc-is-sized-to-the-canvas-box`, which is the same
confusion in the same phase.

## Pick up when

Before Step 5 ships to users, and before any further work on
`2026-09-10-two-stone-renderers-meet-at-the-playback-cut` — that item cannot be
judged until this one is fixed, because the size pop dominates everything else
at the cut.

## Resolved, 2026-09-15

`SPHERE_RADIUS_RATIO` / `SPHERE_DIAMETER_RATIO` are now exported from
`@/components/breath-stone`, and `handleContinue` hands over the sphere rect
(same centre, `rect.width * 0.56`) instead of the canvas element's rect.
`FirstPlaybackScreen`'s `entranceFrom` prop is documented as taking the
sphere.

Re-captured at 4× throttle, 390×844, measuring the sphere's width on the
frames either side of the swap:

| | before | after |
|---|---|---|
| last ceremony frame | 108px | 111px |
| first playback frame | 195px | 110px |
| **change across the swap** | **+87px (+81%)** | **−1px** |

The vertical centre moves 2.5px across the swap, against 4.5px before. What
residual there is comes from the ceremony stone's live breath phase at the
moment of the tap — `shimmer` oscillates ~±3% — which a static rect handoff
cannot cancel and which is far below the visible threshold.

Filmstrip: `.tmp/stone/filmstrip-final2.png`.
