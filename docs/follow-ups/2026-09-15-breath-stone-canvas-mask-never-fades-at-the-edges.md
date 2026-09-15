---
id: 2026-09-15-breath-stone-canvas-mask-never-fades-at-the-edges
priority: P2
status: open
opened: 2026-09-15
resolved:
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
