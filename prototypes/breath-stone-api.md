# BreathStone — component API

Canvas-driven cinematic stone. One component, 11 states. All motion
(breathing, silhouette, sheen, bloom, ember pulse) is driven by the
engine — you pass a `state` string and it does the rest.

Snapshot taken 2026-04-17 from
`src/components/breath-stone/BreathStone.tsx` +
`src/components/breath-stone/breathStoneEngine.ts`.

---

## Import

```ts
import { BreathStone, type BreathStoneState } from '@/components/breath-stone';
```

## Signature

```ts
interface BreathStoneProps {
  state: BreathStoneState;
  size?: number;                    // default: 280
  className?: string;
  onCelebrateEnd?: () => void;      // fires when celebrate returns to idle
  reducedMotion?: boolean;          // default: false — freeze breath + overlays
}
```

## Props

| Prop             | Type              | Required | Default | Notes                                                                                                 |
| ---------------- | ----------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `state`          | `BreathStoneState`| ✓        | —       | Target state. Changes trigger a smooth lerp to the new targets — no snap.                             |
| `size`           | `number`          |          | `280`   | Canvas renders square at this pixel dimension. Internally scales by `devicePixelRatio`.               |
| `className`      | `string`          |          | `''`    | Applied to the `<canvas>` element. Parent usually wraps in `.record-stone` for ground shadow.         |
| `onCelebrateEnd` | `() => void`      |          | —       | Fires ~2200ms after entering `celebrate`, when the stone auto-returns to `idle`. Use to advance UI.   |
| `reducedMotion`  | `boolean`         |          | `false` | When true, freezes breath amplitude to 0 and suppresses all overlay animations (sheen/bloom/shimmer/ember/ripple). Static properties (glow, color temp, spark) still reflect the target state; state changes snap instead of lerping. Pair with `useReducedMotion` from `@/lib/animation/useReducedMotion` so the canvas honors `(prefers-reduced-motion: reduce)` alongside CSS. |

## `BreathStoneState` — the 11 states

```ts
type BreathStoneState =
  | 'idle' | 'ready' | 'recording' | 'working' | 'celebrate'
  | 'playback' | 'shimmer' | 'guidance' | 'priming' | 'infused' | 'archive';
```

| State       | Breath               | Glow      | Color temp | Signature behavior                                                                  |
| ----------- | -------------------- | --------- | ---------- | ----------------------------------------------------------------------------------- |
| `idle`      | 4.5s cycle, 4% amp   | 0.06      | cool       | Resting heartbeat — lightest, slowest, coolest.                                     |
| `ready`     | 4s cycle, 6% amp     | 0.14      | warm       | Awake / attentive. Prismatic spark + sheen sweep.                                   |
| `recording` | 3.5s cycle, 25% amp  | 0.40      | warmest    | Warm bloom radiates into background. Voice-reactive silhouette.                     |
| `working`   | 6s cycle, 2% amp     | 0.04      | coolest    | Patient processing — almost still.                                                  |
| `celebrate` | 2200ms single swell  | 0.55 peak | warmest    | One-shot gesture — smoothstep rise → hold → fall. Fires `onCelebrateEnd` on return. |
| `playback`  | 4s cycle, 5% amp     | 0.12      | warm       | Rhythmic double-sine inner pulse (speech cadence) + edge vignette.                  |
| `shimmer`   | 5s cycle, 3% amp     | 0.08–0.22 | warm       | Ceremonial stillness. Two counter-rotating sheens sweep the surface.                |
| `guidance`  | 6.2s cycle, 3.5% amp | 0.07      | neutral    | Waiting / orienting. Long 19% peak hold + single-sine heartbeat inside.             |
| `priming`   | 6s, 22% amp, 3s/3s   | 0.12      | warm       | "Take a breath" cue — symmetric inhale/exhale, minimal wobble.                      |
| `infused`   | 5s cycle, 10% amp    | 0.20–0.45 | amber      | Voice preserved. Warm body tint + 6s concentric ripple + ember pulse.               |
| `archive`   | static, 0 amp        | 0.02      | cool       | Preserved, still. No animation.                                                     |

Transition between any two states is a per-field lerp (rates vary from
`0.02` for breathSpeed up to `0.06` for innerPulse) — changes feel like
the stone breathing into its new mood, not snapping.

---

## Usage

### Basic

```tsx
<BreathStone state="idle" size={200} />
```

### Paired with ground shadow

The engine does NOT draw its own ground shadow. Wrap in `.record-stone`
(or any container with `::after { background: radial-gradient(...); }`) so
the stone reads as floating above a surface. Omitting the wrapper leaves
the stone floating in pure void.

```tsx
<div className="record-stone">
  <BreathStone state="ready" size={200} />
</div>
```

### Celebrate (with auto-advance)

```tsx
<BreathStone
  state="celebrate"
  size={200}
  onCelebrateEnd={() => advanceView()}
/>
```

The `onCelebrateEnd` callback fires once when the 2200ms gesture
completes. The stone returns to `idle` automatically — you do not need
to explicitly flip `state` back.

**Integration rule — celebration Continue buttons are callback-gated.**
On every screen where `state="celebrate"` is followed by a primary CTA
("Keep going" on both S1→S2 and S2→S3; do not restate the stage number
in the CTA — see Group 4 Finding F), the CTA must ship hidden + disabled
and be revealed only by `onCelebrateEnd`. The
ceremonial one-shot and the "move on" affordance are not allowed to
compete for attention. Do not drive this from `setTimeout(…, 2200)` in
React — the callback is the source of truth, and using the timer
duplicates a constant that the engine already owns. Reset the gated
state when the screen is re-entered (route change, back-nav, dev
replay) so the second playthrough also starts hidden.

```tsx
const [isReady, setIsReady] = useState(false);

// Reset on screen mount / re-entry
useEffect(() => { setIsReady(false); }, [celebrationKey]);

<BreathStone state="celebrate" onCelebrateEnd={() => setIsReady(true)} />
<button
  className={`btn-primary ${isReady ? 'is-ready' : 'is-waiting'}`}
  disabled={!isReady}
>
  Keep going
</button>
```

Resolved 2026-04-17 — Pass 2 decision: both celebrations (S1→S2 and
S2→S3) use this pattern. The "dwell longer on S2→S3" intuition belongs
in copy/tempo, not in whether the callback is used. See
`prototypes/voice-recording-flow.html` ds-gaps item 7 (Resolved in Pass 2).

### Layered overlays (celebration variant)

The full celebration moment stacks two CSS-only overlays on top of the
canvas for extra punch:

```tsx
<div className="record-stone record-stone--celebrate">
  <span className="celebrate-shimmer" />   {/* ring pulse */}
  <span className="celebrate-specks" />    {/* 5 diagonal sparks */}
  <BreathStone state="celebrate" size={200} />
</div>
```

Both overlays are defined in `src/app/globals.css`
(`shimmer-pulse-enhanced`, `light-specks`). They run from `animation`
and play once on mount — remount the node to replay.

---

## Rendering notes

- The canvas is wrapped in a **soft radial mask** so the engine's
  full-rect paints and the stone's own overshooting bloom don't leave a
  visible rectangle against dark backgrounds. It is keyed to
  `closest-side`, not the default farthest-corner — on a square canvas
  farthest-corner puts 100% at the *diagonal*, which leaves the edge
  midpoints inside the opaque region, so they never fade. That was a
  live bug until 2026-09-15: the mask softened only the corners and
  shipped a visible box on all 25 consumers. The exact stops are
  measured against the widest the stone body ever gets (84.3% of the
  half-width, in `recording`) — see the comment on `EDGE_MASK` in
  `BreathStone.tsx` before changing them.
- Size changes re-scale the canvas via `engine.resize(size, size)` —
  safe to animate, though changing every frame is wasteful.
- The canvas is `aria-hidden="true"`. The stone is decorative, not
  informational.
- `devicePixelRatio` is handled internally — you pass CSS pixels.

## Design rules (locked in)

- **No peak tremor.** The stone is a calm guardian. Never add
  `peakTremor` / jitter to new states. The field exists on `StateParams`
  for per-state override, but default to `0`.
- **Warm ceramic body is locked — re-cut 2026-09-15, by owner decision.**
  The previous lock named `#F8F0DC → #7D827E` and said it must not be
  modified. The owner lifted that specifically to bring the canvas stone
  onto the same material as the Step 5 CSS stone, which is the other end
  of the `detail → playback` cut. The ramp now runs
  `#FDFAF0 → #C8B589` and is fitted, not invented — see
  *Matching the Step 5 stone* below. **The lock still stands on the new
  values**: state colour comes from overlay layers (tint, sheen, spark,
  bloom), never from re-cutting the body gradient. Changing it again is
  an owner call.
- **Top-left light source.** All gradients originate at
  `(-radius * 0.28, -radius * 0.28)`. Inset highlights top-left, inset
  shadow bottom-right. Do not invert — that produces a "bowl" look.
- **Form is directional; the body gradient is not.** The body gradient
  is radially symmetric about its focus, and the two-circle geometry
  puts the lit rim at s≈0.633 and the shadow rim at s≈0.799 — so close
  together that no set of stops can make one bright and the other dark.
  Sphericity therefore comes from the **terminator** layer (a linear
  gradient on the light axis), exactly as the CSS stone gets it from
  `inset` box-shadows rather than from its gradient. If the stone ever
  reads flat again, that is the layer to look at, not the stops.
- **No visible border ring.** Depth comes from gradient + shadow
  alone.
- **No markings on the body.** An "artisan veining" pass used to stamp
  eight blurred pigment ellipses across the stone. Because their
  placement was seeded from a fixed noise field, every stone got the
  same arrangement — which at ceremony size read as a face. Removed
  2026-09-15. `ds/breath-stone.html` covers this twice: *"Don't add
  sparkle, particles, sheen-sweeps, or secondary ornament"* and
  *"Don't give it a face, eyes, mouth, or limbs."* Surface interest
  comes from the per-frame micro-roughness pass only, which is
  sub-pixel and evenly distributed — texture, never marks.
- **Nothing is painted outside the stone.** The engine used to drift 25
  ambient specks across the whole canvas rect. Environment layers may
  light the stone; they may not put objects in the air around it.

## The canvas is not the stone

`size={200}` is a **200px canvas holding a 112px sphere**, not a 200px sphere.
The engine draws at `SPHERE_RADIUS_RATIO` (0.28) of the shorter side, and the
rest of the box is headroom for the bloom (3.5x radius) and haze (2x).

Anything that positions itself against the stone must size against the sphere:

```ts
import { SPHERE_DIAMETER_RATIO } from '@/components/breath-stone';
const sphere = canvasRect.width * SPHERE_DIAMETER_RATIO;   // 0.56
```

Both ratios are exported for this reason. Two separate pieces of code had
already assumed the box *was* the stone and come out ~1.8x too large — the
`detail -> playback` handoff, and the ceremony's glimmer disc. See
`docs/follow-ups/2026-09-15-the-match-cut-scales-the-canvas-box-not-the-stone.md`.

## Matching the Step 5 stone

The ceremony hands off from this canvas stone (`detail`) to the CSS stone in
`FirstPlaybackScreen` (`playback`). They are two renderers showing one object,
so they have to be the same material. As of 2026-09-15 they are, and the way to
check is to measure rather than to look.

`.tmp/stone/match.mjs` (throwaway, recreate as needed) renders both at the same
sphere diameter and samples colour along the light axis — the upper-left rim,
through the centre, to the lower-right rim. Agreement, worst channel per
sample point:

| | before | after |
|---|---|---|
| lit rim | 40 | 8 |
| centre | 28 | 10 |
| shadow mid | 26 | 13 |
| **shadow rim** | **61** | **3** |

The shadow rim was the whole problem: the canvas fell 4 levels across its
shadow half where the CSS stone falls 75, which is what read as a flat disc
rather than a sphere.

**Pin `--lum: 0` on the target, and do not use reduced motion to do it.**
`FirstPlaybackScreen` drives `--lum` per word through the speech sequence under
reduced motion as well, so sampling that way catches the stone mid-lit — ~23
levels bright at the shadow rim. Fitting to it leaves the canvas stone visibly
pale across its whole shadow half, which is exactly what happened on the first
pass. Override it from a stylesheet instead:

```js
await page.addStyleTag({ content: '.fpb { --lum: 0 !important; --sus: 0 !important; }' });
```

Two things worth knowing before touching any of this:

- **The last two stops used to be dead.** The visible stone only ever reaches
  gradient position **s ≈ 0.80**, so the old `0.90` and `1.00` stops
  (`#938A7D`, `#7D827E`) were painted nowhere at all. The rim you actually see
  is the `0.84` stop. Anything past ~0.85 is headroom, not colour.
- **Warmth on the shadow side belongs to the terminator, not the body.**
  Fitting it into the body gradient fails: s≈0.42 needs blue ≈226 on the lit
  side and ≈195 on the shadow side, and it is one stop. The terminator colour
  `rgba(52, 38, 8)` carries that difference.

## Adding a new state

1. Add the name to the `BreathStoneState` union in `breathStoneEngine.ts`.
2. Add a `StateParams` entry to `STATE_TARGETS` with the 12 target values
   (glowIntensity, breathAmplitude, irregularity, colorTemp,
   backgroundBloom, spark, innerPulse, vignette, breathSpeed,
   voiceReactive, sheen, peakHold — plus optional peakTremor,
   inhaleRatio, breathNoiseScale).
3. If the state needs bespoke per-frame behavior (shimmer's dynamic
   glow, infused's ember pulse), add a branch inside the `draw` loop
   after the `target` clone.
4. Update `prototypes/voice-recording-flow.html`'s state grid + blurb
   map so the reference reflects reality.
5. Update this file.
