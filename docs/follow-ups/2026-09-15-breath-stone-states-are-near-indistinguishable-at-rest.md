---
id: 2026-09-15-breath-stone-states-are-near-indistinguishable-at-rest
priority: P3
status: open
opened: 2026-09-15
resolved:
summary: "19 of the 45 Breath Stone state pairs differ by 12 levels or less on the stone's surface — Guidance and Archive differ by 1 — because nearly every state parameter drives the halo or the motion, not the body *(owner observation on the state grid, 2026-09-15)*"
---

# The states barely differ when the stone is still

*(owner, reviewing the 10-state grid after the 2026-09-15 material pass:
"the different states are quite similar")*

`src/components/breath-stone/breathStoneEngine.ts` (`STATE_TARGETS`)

Measured: each state sampled at five points along the light axis on the
sphere, averaged over four frames so breath phase does not dominate, worst
channel difference per pair.

| | |
|---|---|
| state pairs within 12 levels (of 45) | **19** |
| widest gap between any two states | 50 |
| closest pair | **Guidance / Archive — 1** |

Against `idle`: Priming 2, Working 5, Playback 5, Archive 9, Guidance 10,
Shimmer 12, Ready 18, Recording 18, Infused 44.

## Not caused by the material pass

Worth recording, since the observation arrived right after that work. The same
measurement on the build from before the re-cut ramp and terminator:

| | before the material pass | after |
|---|---|---|
| pairs within 12 levels | 23 | **19** |
| widest gap | 49 | 50 |
| Guidance / Archive | 1 | 1 |

Slightly *better*, not worse. This is long-standing and structural.

## Why

Most of `StateParams` never touches the stone's surface:

- `glowIntensity`, `backgroundBloom`, `colorTemp` drive the HDR bloom, the
  haze and the ambient wash — all painted **behind** the silhouette. They
  change the halo, not the body. So `recording` (glow 0.40, bloom 1) differs
  from `idle` by only 18 on the sphere itself, even though its surroundings
  differ enormously.
- `breathAmplitude`, `breathSpeed`, `peakHold`, `innerPulse` are **motion**.
  In a still frame they contribute nothing at all.
- What is left that marks the body is `sheen`, `spark`, and `infused`'s tint
  layer — which is why `infused` (44) is the only state that clearly stands
  apart.

`guidance` vs `archive` is the clean illustration: glow 0.07 vs 0.02,
amplitude 0.035 vs 0, innerPulse 0.18 vs 0, breathSpeed 6200 vs 99999. Every
one of those differences is motion or halo. On a frozen sphere they are the
same object.

**Caveat on the numbers:** they sample the sphere only. The halo differences
are real and large, and a user sees the stone breathing rather than frozen. So
this understates how distinguishable the states are in use — the question is
whether that gap is intentional.

## Why it matters

Depends on an unanswered design question: **is the stone meant to be readable
at a glance, or is it one continuous presence whose state the user feels
rather than identifies?** `ds/breath-stone.html` calls it "the signature
motif" and a "calm guardian", which leans toward the second. If so, this is
working as intended and the item should be dropped.

If states are meant to read distinctly, the lever is the body, and the
constraint is that the ds forbids the obvious moves — no sparkle, no
particles, no sheen-sweeps, no ornament, no recolouring into electric
gradients. The room that leaves is roughly: per-state warmth on the body (the
`infused` tint layer generalised, which is the one state that demonstrably
works), and per-state terminator depth — a "harder light" for active states,
softer for resting ones, which is free because the terminator layer already
exists.

## Pick up when

After beta. The owner's call on 2026-09-15 was explicitly "good for beta,
refine further down the line". Answer the design question first; do not tune
numbers before it is settled.
