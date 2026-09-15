---
id: 2026-09-15-ceremony-canvas-stone-runs-at-30fps-under-throttle
priority: P3
status: open
opened: 2026-09-15
summary: "The First Breath ceremony's canvas stone renders every frame in ~33ms at 4× CPU throttle — a steady 30fps, but every frame is above the repo's 20ms bar, on the product's most ceremonial screen *(measured incidentally during Step 5 prefetch A/B, 2026-09-15)*"
---

# The ceremony opening runs at 30fps under throttle

*(measured while A/B-ing the Step 5 prefetch timing — not caused by that change)*

`src/components/breath-stone/breathStoneEngine.ts` · `/dev/record-complete`

Six 6-second captures of the ceremony's opening at 4× CPU throttle, 390×844,
page visible and focused:

| | p50 | p95 | max |
|---|---|---|---|
| all six runs | 33.3–33.4ms | 34.7–35.0ms | 35.0–35.4ms |

181 frames per 6s window — a pinned ~30fps. CLAUDE.md's bar is *no frame over
20ms at 4×*; here **every** frame is.

## It is steady, not janky — which is why it has gone unnoticed

Variance is near zero (one run's full spread was 7.8ms). A constant 30fps reads
as smooth to the eye; what reads as jank is variance and spikes, and there are
none. This is why it has never been reported, and it is a fair argument that it
is not urgent.

It is still 30fps on the beat the whole product builds toward.

## Root cause

Not a deliberate cap — the engine's loop is an uncapped
`requestAnimationFrame(this.draw)` (`:392`, `:1101`). 33ms is simply the honest
cost of the paint: the draw builds roughly ten `createRadialGradient`s per frame
(ambient, shadow, vignette, bg bloom, HDR bloom, haze, env shadow, body, …),
each allocated fresh, then composites them. At 1× there is headroom to hide it;
at 4× there is not.

For contrast, Step 5's stone — the same object, rendered in CSS layers — measures
p95 9.2ms / max 9.4ms on the same machine at the same throttle, with zero frames
over 20ms. The gap is the renderer, not the design.

## Why it matters

- It is the **ceremony**, and the one moment MASTER_SPEC treats as sacred.
- A mid-range Android at 1× is roughly this machine at 4× — that is the whole
  premise of the throttle bar.
- Same class as `2026-07-12-record-animation-frame-pressure-under-cpu-throttle`
  (42fps @4× on the record screen). Two of the three most animation-heavy
  screens now measure under the bar, which starts to look systemic rather than
  incidental — both are canvas, and the CSS screens are not.

## Fix shape

Do not port the renderer. That was already considered and rejected on evidence
in `2026-09-10-two-stone-renderers-meet-at-the-playback-cut` — weeks across 11
states and 25 consumers. The cheaper paths, in order:

1. **Cache the gradients.** They are rebuilt every frame but depend only on
   radius and state, which change rarely. A memo keyed on those should remove
   most of the per-frame allocation.
2. **Skip layers that contribute nothing at the current state.** Several are
   near-transparent outside specific states.
3. **Only then** consider a resolution or device-pixel-ratio trade.

Measure before and after on `/dev/record-complete` at 4×, same method as above —
and check `visibilityState` first: a backgrounded page reports a 1Hz rAF that
looks like catastrophic jank and is an artifact.

## Pick up when

Next time the ceremony or the stone engine is open, or before a broader motion
pass. Not a launch blocker — it is steady, and it has shipped this way.
