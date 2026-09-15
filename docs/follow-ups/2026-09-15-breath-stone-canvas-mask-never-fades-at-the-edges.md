---
id: 2026-09-15-breath-stone-canvas-mask-never-fades-at-the-edges
priority: P2
status: resolved
opened: 2026-09-15
resolved: 2026-09-15
summary: "The Breath Stone canvas shows a visible rectangular 'box' on every dark screen — its radial mask defaults to farthest-corner, so it softens only the four corners and stays fully opaque along all four edges *(found by the owner on an iPhone, 2026-09-15)*"
---

# The stone sits in a visible box

*(found by the owner walking the ceremony on an iPhone)*

`src/components/breath-stone/BreathStone.tsx` (maskStyle)

The canvas engine deliberately paints an ambient gradient and drifting specks
across the **whole canvas rect** for depth. A radial mask is meant to hide that
rect. The mask's own comment says so:

> *"Soft radial mask hides the canvas's rectangular corners… which reads as a
> visible 'box' against a dark background."*

It does not work. `radial-gradient(circle, …)` with no size keyword defaults to
**farthest-corner**, which on a square canvas puts 100% at the diagonal, not the
edge. Measured live on the 140px ceremony stone:

| | |
|---|---|
| canvas | 140 × 140 |
| gradient extent (farthest-corner) | **99px** |
| edge midpoint | **70px** |
| edge as % of gradient | **70.7%** |
| mask is fully opaque until | **80%** |

So the edges sit *inside* the opaque region and never fade at all. Only the
corners (70.7%→100%) get any falloff. The result is a square with softened
corners — exactly the artifact the mask was added to prevent.

## Why it matters

`BreathStone` has **25 consumers** across onboarding, record, message creation,
the shelf, Home A/B and the First Breath ceremony. The box is visible on every
dark-ground screen among them. It reads as unpolished on the product's single
hero object.

## Fix shape

One line. Give the gradient a size keyword so 100% lands on the nearest edge,
then fade well before it:

```
radial-gradient(closest-side, black 0%, black 62%, transparent 96%)
```

`closest-side` makes 100% = half the shorter dimension, so the falloff is in
terms of the edge rather than the diagonal. The 62% figure needs checking
against the stone's max breath scale (1.30) so the sphere itself is never
clipped — that is the whole reason the original used 80%.

Verify on a dark ground at several sizes: the ceremony renders at 140px and
200px, the shelf and message screens at others.

## Pick up when

Next session. It is one line, it is independent of every other open item, and
it improves 25 screens at once.

## Resolved, 2026-09-15

Fixed in `BreathStone.tsx` — the mask is now keyed to `closest-side` so 100%
lands on the nearest edge rather than the diagonal, and it reaches full
transparency at exactly 100%, leaving no hard cut anywhere on the boundary.

**The stops in the fix shape above were wrong and were not used.** `black 62%,
transparent 96%` would have eaten into the stone body in six of the eleven
states. Measured on the live canvas, the widest the body ever gets is:

| state | body rim, % of half-width |
|---|---|
| recording | **84.3%** |
| priming | 74.3% |
| infused | 68.6% |
| ready / playback / shimmer | 65.7% |
| guidance | 60.0–64.3% |
| idle / archive / working | 55.7–62.9% |

Recording stacks the 1.30 breath clamp, the 1.15 voice-reactive multiplier and
silhouette irregularity, which is why it runs so much wider than the rest. So
the falloff is back-loaded rather than linear — full opacity through the
mid-80s, with the real work in the last 10% where only the faint overshoot
lives:

```
radial-gradient(closest-side,
  #000 0%, #000 84%,
  rgba(0,0,0,0.94) 90%,
  rgba(0,0,0,0.72) 95%,
  transparent 100%)
```

### Verified

Every state, at 140px and 200px, on `#0B0A09`, measuring the composited page
(a CSS mask is invisible to `getImageData`, so the canvas backing store cannot
be used to check this):

- **Box** — worst boundary pixel went from **3–11 levels above the ground to
  0–1**, i.e. below perceptual threshold, in all 11 states at both sizes.
- **Stone not clipped** — the body rim measured off the composite is unchanged
  from baseline in every state, including recording. The mask is not eating
  the stone.
- 4× CPU throttle, 390×844: no change (this is a static CSS mask, not motion).

Captures in `.tmp/stone/sheet-140-*.png` / `sheet-200-*.png` — each pair also
shown with the shadows stretched 14×, which makes the old artifact read
unmistakably as an octagon: corners softened, edges hard, exactly as diagnosed.

### Also fixed

`/dev/breath-stone` rendered only on cream, which is why a dark-ground-only
artifact on the product's hero object went unseen. It now defaults to a dark
ground and carries size (140/200/280/320), ground and canvas-rect toggles.

`prototypes/breath-stone-api.md` documented the old mask string; updated, with
a note that the stops are measured and a pointer to the measurement.
