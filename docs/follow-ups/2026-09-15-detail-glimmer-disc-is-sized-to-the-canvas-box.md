---
id: 2026-09-15-detail-glimmer-disc-is-sized-to-the-canvas-box
priority: P3
status: resolved
opened: 2026-09-15
resolved: 2026-09-15
summary: "The `detail` phase's glimmer band runs in a 220px disc around a 112px stone, so a drifting crescent of light is painted up to ~56px OUTSIDE the stone's silhouette on the dark ground — a sheen-sweep, which the design system forbids twice over *(found capturing the cut at 4× throttle, 2026-09-15)*"
---

# A lit crescent orbits outside the stone

*(found while capturing the `detail → playback` cut; visible in every
pre-tap frame)*

`src/components/screens/FirstBreathSequence.tsx:684-706`
(`stoneGlimmerStyle` / `stoneGlimmerBandStyle`)

The `detail` phase overlays a drifting light band on the stone:

```js
const stoneGlimmerStyle = {
  width: 220, height: 220, marginLeft: -110, marginTop: -110,
  borderRadius: '50%', overflow: 'hidden', mixBlendMode: 'screen', …
};
```

A **220px** disc. The stone's sphere at this phase is **112px**
(`0.28 * 200 * 2`). So the band — `linear-gradient(110deg, …)`
screen-blended, drifting on a 6s loop — is clipped to a circle nearly twice
the stone's size, and the ~54px annulus between them is empty dark ground.

Measured 70px below the stone's centre, which is 16px clear of the sphere's
bottom edge, on a ground sitting at luminance ~26: the band peaks at **87**.
That is a bright crescent orbiting in the air beside the stone.

The `220` is not arbitrary — it is the canvas rect (200) plus a little. Same
confusion as `2026-09-15-the-match-cut-scales-the-canvas-box-not-the-stone`:
the canvas's *box* treated as if it were the *stone*.

## Why it matters

`ds/breath-stone.html` forbids this twice in its Don't list:

- *"Don't add sparkle, particles, sheen-sweeps, or secondary ornament."* This
  is a sheen-sweep.
- And the rule now recorded in `prototypes/breath-stone-api.md` after the
  2026-09-15 pass: **nothing is painted outside the stone**. Environment layers
  may light the stone; they may not put objects in the air around it.

It also lands on the beat right before the payoff, and it is screen-blended
over the stone itself — which means it lifts the stone's shadow side and works
directly against the terminator that was just fitted to match the Step 5
stone. Measured across the real cut, the ceremony stone's shadow mid reads
`#D2C8AF` against the CSS stone's `#BEAD8A`; on the bench, with no glimmer, the
same comparison is within 13 levels. **The glimmer is a meaningful part of the
remaining material gap at the cut.**

## Fix shape

Smallest correct change: size the disc to the sphere, not the box —
`112px` (or `canvas * 0.56`) with the matching negative margins, using the
same exported ratio proposed in the match-cut item so the number is not
written down twice.

But consider removing it outright. The canvas engine already runs a
**two-layer counter-rotating sheen** for `shimmer` (`breathStoneEngine.ts`,
"Shimmer double sheen"), clipped correctly to the silhouette, which is the
sanctioned way this state catches light. The DOM glimmer is a third sheen
stacked on top of those two, and the ds rule reads as prohibiting all of it.
Removing it is one deletion and improves the cut match for free.

## Pick up when

With `2026-09-15-the-match-cut-scales-the-canvas-box-not-the-stone` — same
root confusion, same phase, and the cut cannot be judged clean while this is
lifting the stone's shadow side.

## Resolved, 2026-09-15 — removed, not resized

Resizing the disc to the sphere was tried first, since it was the smaller
change. **It relocates the artifact rather than removing it.** With the disc at
112px its clip edge lands exactly on the rim, and the screen-blended band
inside then reads as a hard bright ring hugging the stone's outline — which
`ds/breath-stone.html` forbids just as explicitly: *"Don't outline it with a
hard ring."* Captured three ways in `.tmp/stone/glimmer-options.png`:

| | |
|---|---|
| 220px (as shipped) | crescent of light outside the stone |
| 112px (resized) | hard bright ring on the silhouette |
| removed | clean |

And it could never have been made right from the DOM. The stone's silhouette is
a **per-frame Perlin path**, not a circle, so no `border-radius: 50%` element
can align to it. Only the engine can clip to the real outline — and it already
does: `shimmer` runs a two-layer counter-rotating sheen against the silhouette
itself. The DOM glimmer was a third sheen stacked on those two.

Removed, along with the now-orphaned `lightDrift` keyframes and their
reduced-motion override.

Side effect, as predicted: it was screen-blending over the stone's shadow side.
With it gone, the ceremony stone's shadow rim reads 21 levels darker and the
material comparison across the cut improved accordingly.
