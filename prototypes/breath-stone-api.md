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
}
```

## Props

| Prop             | Type              | Required | Default | Notes                                                                                                 |
| ---------------- | ----------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `state`          | `BreathStoneState`| ✓        | —       | Target state. Changes trigger a smooth lerp to the new targets — no snap.                             |
| `size`           | `number`          |          | `280`   | Canvas renders square at this pixel dimension. Internally scales by `devicePixelRatio`.               |
| `className`      | `string`          |          | `''`    | Applied to the `<canvas>` element. Parent usually wraps in `.record-stone` for ground shadow.         |
| `onCelebrateEnd` | `() => void`      |          | —       | Fires ~2200ms after entering `celebrate`, when the stone auto-returns to `idle`. Use to advance UI.   |

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

- The canvas is wrapped in a **soft radial mask**
  (`radial-gradient(circle, black 0% 80%, transparent 98%)`) so the
  engine's ambient dust-mote pass doesn't leave a visible rectangle
  against dark backgrounds.
- Size changes re-scale the canvas via `engine.resize(size, size)` —
  safe to animate, though changing every frame is wasteful.
- The canvas is `aria-hidden="true"`. The stone is decorative, not
  informational.
- `devicePixelRatio` is handled internally — you pass CSS pixels.

## Design rules (locked in)

- **No peak tremor.** The stone is a calm guardian. Never add
  `peakTremor` / jitter to new states. The field exists on `StateParams`
  for per-state override, but default to `0`.
- **Warm ceramic body is locked.** The 8-stop body gradient
  (`#F8F0DC → #7D827E`) reproduces the reference prototype and **must
  not be modified**. Color variation between states comes from overlay
  layers (tint, sheen, spark, bloom), never from changing the body
  gradient.
- **Top-left light source.** All gradients originate at
  `(-radius * 0.28, -radius * 0.28)`. Inset highlights top-left, inset
  shadow bottom-right. Do not invert — that produces a "bowl" look.
- **No visible border ring.** Depth comes from gradient + shadow
  alone.

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
