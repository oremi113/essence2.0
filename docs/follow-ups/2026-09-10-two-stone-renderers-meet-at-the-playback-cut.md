---
id: 2026-09-10-two-stone-renderers-meet-at-the-playback-cut
priority: P2
status: decision
opened: 2026-09-10
resolved:
owner_paired: true
summary: "The First Breath ceremony has two different Breath Stone implementations — a canvas engine and the CSS dark-stage stone — and they meet at the `detail → playback` cut, where the stone visibly changes material in one frame *(found building Step 5 Chunk 3, 2026-09-10)*"
---

# Two stone renderers meet mid-ceremony

*(found while building the Step 5 `detail → playback` handoff)*

`src/components/breath-stone/breathStoneEngine.ts` · `src/components/screens/first-playback/FirstPlaybackScreen.css.ts` · `src/components/screens/FirstBreathSequence.tsx`

The ceremony's stone is a **canvas** engine. Step 5 First Playback's stone is
**CSS layers** driven by `--lum` / `--sus`, per `prototypes/ds/dark-stage.html`,
where every measured performance number belongs to the CSS implementation.

They now meet at the `detail → playback` boundary, and they do not look alike:

| | `detail` (canvas, `shimmer`) | `playback` (CSS) |
|---|---|---|
| Surface | pale, matte, cooler | warm, glossy |
| Lighting | diffuse, near-flat | directional — highlight upper-left, warm shadow lower-right |
| Ornament | animated shimmer band | none |

## What was tried

**A 700ms cross-dissolve.** Built and rejected on the evidence: for the length of
the fade both renderings are visible at once and the canvas stone's brighter core
reads as a hard-edged disc floating inside the CSS sphere. Objectively broken —
`.tmp` captures showed it clearly.

**A match cut** (what currently ships). The two stones are geometrically
identical at the tap, so the swap happens in one frame with the hero object in
the same place at the same size, and the CSS stone then travels to its own
position. This removes the disc artifact entirely and is the better of the two.

But a match cut cannot hide a *material* change. The stone still switches
surface and lighting model in one frame.

## Why it matters

`ds/dark-stage.html` states the rule for this boundary plainly: **the stone must
not re-enter.** It currently does not re-enter — but it does change substance,
which is arguably a worse violation of the same intent. This is the ceremony's
single hero object, at its most ceremonial moment.

## Fix shape

**Unify on the CSS stone.** Extract the seven-layer stone from
`FirstPlaybackScreen` into a shared component and render it for `detail` (and
plausibly `preserved`) too. The cut then becomes CSS→CSS and is genuinely
invisible; the atmosphere layers stay Step 5's alone.

Rejected alternative: port the CSS stone to canvas. That discards the measured
work the dark-stage card was promoted from, and the atmosphere layers read
`--lum` through `calc()` — they are CSS-native by design.

**This touches a shipped screen and its motion, so it is an owner call, not a
refactor to take unilaterally.** Needs a visual pass at 4× throttle on 390×844
across all four existing phases before and after.

## Owner review, 2026-09-15 — and a much cheaper fix path

The owner compared both stones on device. Verdict: the smooth (CSS) stone is
better looking, and the canvas stone "looks like it has seeds in it."

**The design system already agrees**, on two counts the canvas stone breaks:

- *"Don't add sparkle, particles, sheen-sweeps, or secondary ornament."* The
  engine paints 25 drifting specks across the rect (`breathStoneEngine.ts:668`).
- *"Don't give it a face, eyes, mouth, or limbs."* The "seeds" are the
  **Artisan veining** pass (`:888-903`) — 8 blurred pigment ellipses placed by
  noise. At 140px on a phone they read as two eyes and a mouth. On a product
  about a dying person's voice, that is not a small risk.

**This does NOT require porting to CSS.** That was over-scoped: 11 animated
states, 25 consumers, a 1034-line engine — weeks, with every screen's motion
needing re-verification.

All three objections are fixable **inside the canvas engine**, none of them
touching the state machine, the breath timing, or any consumer's API:

| objection | where | size |
|---|---|---|
| the box | the mask, `BreathStone.tsx` | 1 line — filed separately as `2026-09-15-breath-stone-canvas-mask-never-fades-at-the-edges` |
| the "seeds" / face | Artisan veining, `:888-903` | ~15 lines, state-independent |
| particles | ambient specks, `:668` | ~10 lines, ds violation regardless of taste |

Agreed sequencing:

1. **The box** — one line, standalone, improves 25 screens.
2. **Make the canvas stone smooth** — remove veining and particles, retune the
   surface to read like the Step 5 stone. Needs owner eyes mid-flight: produce
   before/after captures at 140px and 200px on a dark ground rather than
   describing it. "Smooth" has a range.
3. **Re-look at the cut** — only if still needed. If both stones read as the
   same material, the `detail → playback` swap stops being a material change and
   full unification may never earn its cost.

## Pick up when

Before Step 5 ships to users. The beat works and performs without it — this is a
craft defect at the seam, not a functional one.
