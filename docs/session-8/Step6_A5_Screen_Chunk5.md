# Step 6 · A5 (Generation) — Screen build, Chunk 5

Chunk 5 of the per-screen spine plan (A7 ✅ → A4 ✅ → **A5** → A3 → C1–C3).
A5 is the "shaping your message" wait that sits between A4 (note) and A6
(preview) in the forward flow: the LLM call (and, in the control arm, the
ElevenLabs render) runs while the screen breathes. Latency is real
(inventory §A5), so the screen earns its keep — a held, ceremonial moment
rather than a spinner.

**Authoritative prototype:** `prototypes/message creation/essence-step6-a5.html`,
plus `ESSENCE_Step6_Message_Creation_Screen_Inventory.md` §A5 (A5.a
Standard, A5.b Failed — single warm retry).

## Scope (this chunk)

1. **Pure screen** — `src/components/screens/messages/GenerationScreen.tsx`
   (+ `.types.ts`, `.css.ts`). Props-driven; `status` ('working' | 'failed')
   drives the stage, `onRetry` / `onAdjustNote` bubble out.
2. **Dev sandbox** — `/dev/messages-generation` (permanent): Working
   (beats advance live), Failed · note, Failed · skip, replay.

**Out of scope (deferred to the A3 chunk):** slotting A5 into the
`/messages/new` forward flow. A5 is reached only from A4 submit in the
forward flow, which needs A3 (Category) to exist — the same blocker A4's
forward entry had. A5 has **no independent live route**: on the reshape
path (A6→A4→A6) A4's honoring moment holds and routes straight to A6, so
nothing reaches A5 today. The screen + dev page ship now; the page-owned
`/generate` + navigation wiring lands with A3.

## Design contract (from the prototype)

- **No backbar.** Generation is in flight and can't be backed out of
  without losing the request (prototype note). Success is modelled by
  **unmount** — the parent navigates to A6 while the stone is still
  breathing; there is no in-screen "done" state.
- **Atmosphere stack (ceremonial mode)** — unlike A4 (flat warm-phase),
  A5 keeps the prototype's three warmth layers: a 3-stop gradient ground,
  a slow ambient glow (13s) centred on the stone, and a static corner
  vignette. This is the point of the screen — a held wait, not an input
  surface.
- **Working copy beats** progress on a timer while in flight:
  1. "Shaping your message." / "A minute, no more." (0–4s)
  2. "Listening for the right tone." / "Choosing the words that fit." (4–9s)
  3. "Almost there." / "Nothing is lost." (9s+)
  Each swap is an 800ms cross-fade (dim to 0.3 → swap text → undim). No
  bar, no percentage, no countdown (inventory §A5).
- **Failed stage shifts to task mode** — content pushed higher
  (`justify-content: flex-start`, top padding), actions above the fold.
  The stone shrinks (180→160) and reverts to the warm `ready` tone.
  - **With note:** "Couldn't quite land it." / "Something slipped on our
    end." / "Your note is kept." → primary **Try again** (re-runs
    `/generate`) + secondary link **Adjust your note** (→ A4, note
    pre-filled). Primary = fastest recovery; edit is the fallback.
  - **Without note:** same title, aside "Something slipped on our end.
    Nothing is lost.", no reassurance, **Try again** alone (no note to
    adjust).
- **Entrance:** crumb 100ms → stone 300ms → title 500ms → aside 700ms,
  each a fade + 8px drift.
- **Stone:** shared canvas `BreathStone` — `working` (cool) while
  generating, `ready` (warm honey) on failure. The prototype's CSS stone
  + its keyframes are dropped (A4/A6/A7 precedent).
- Reduced motion: entrance instant, ambient glow **pinned** to a mid
  frame (not paused — the A7 halo lesson), beat cross-fades kept but
  softened so the screen doesn't freeze silent mid-wait (prototype's
  explicit choice).

## Contract shape (why status-driven, not promise-driven)

A4 used a promise (`onSubmit` returns a result; the screen manages
honoring→input on failure) because its success path stays on-screen (the
honoring moment holds). A5's success path is **navigate away** (unmount),
so the cleaner separation is status-driven, matching A7: the page owns the
`/generate` round-trip and flips `status` ("working" in flight → "failed"
on not-ok); success just unmounts A5. The screen owns only presentation —
the beat timer and motion — and never fetches. A parent that flips
failed→working on retry without remounting gets a clean reset (beat → 1)
via React's "adjust state during render" pattern, keeping the timer effect
free of synchronous setState.

## Build notes / footguns cleared (2026-06-12 reconciliation checklist)

- **`forwards`-fill entrance vs the beat-swap (the A5 footgun the sweep
  flagged, ~4 animations).** Converted the title/aside entrance to a
  `backwards` fill so it releases to natural styles and the class-driven
  `.is-fading` cross-fade can take over (a `forwards` fill would pin the
  keyframe opacity and the beat dim would never apply — the A4 question-
  recede bug's twin). Crumb + stone-wrap also use `backwards` for
  consistency (no competing state, harmless).
- **Self-inflicted invisibility bug, caught + fixed in browser:** the
  first pass kept the prototype's `opacity: 0` *base* on the entrance
  elements alongside the new `backwards` fill + a `from`-only keyframe —
  so they animated from 0 back to a base of 0 and ended invisible (the
  prototype only got away with `opacity:0` base because it paired it with
  a `forwards` fill and an explicit `to{opacity:1}`). Removed the
  `opacity:0` bases; with `backwards`, the base must be the *end* state
  (opacity 1), exactly as A4 does it.
- **Brightness-on-stone-loop:** N/A — the CSS stone is dropped (canvas).
- **Stale `--shadow-mineral`:** uses the re-keyed warm token (#40).
- **Reduced motion pins, not pauses:** the ambient glow is pinned to
  opacity 0.92 / scale 1.02 (verified computed), never `paused`.
- Two bespoke gradient stops (`#EDE4D4`, `#F5ECD8`) and the glow/vignette
  rgba values are designer-tuned atmosphere, not semantic ramp tokens, so
  they stay literal (same treatment as A4's ambient-glow rgba).
- `--line-height-hero` (prototype, 1.25) has no production token — inlined
  on the working title with a comment.

## Smoke tests (browser, 2026-06-12)

Dev sandbox `/dev/messages-generation`, 390×844 mobile viewport
(screenshots in `.tmp/a5-*.png`):

- **Working** renders: crumb pill "FOR SARAH · ENCOURAGEMENT", cool
  `working` canvas stone, centered copy.
- **Beat progression** instrumented: 1→2 swap at ~4.0s, 2→3 at ~9.1s,
  each behind an 800ms cross-fade (title `.is-fading` toggles, opacity
  dips and recovers). Matches prototype cadence.
- **Failed · note:** smaller warm stone, reassurance line, mineral
  **Try again** + ghost **Adjust your note**.
- **Failed · skip:** retry alone — no reassurance, no secondary.
- **4× CPU throttle** (CDP), working stage with entrance + glow + stone
  breathing: avg **8.3ms** / p95 9.9ms / worst **10.3ms** per frame —
  under the 16.7ms budget (opacity/transform + canvas only). Matches A4's
  profile.
- **Reduced motion** (`prefers-reduced-motion: reduce`): title/aside/crumb
  computed opacity 1 with `animation-name: none` (arrive complete, no
  hidden entrance delay); ambient glow `animation-name: none`, opacity
  0.92 (pinned, not collapsed). Screenshot confirms full composition.
- Console clean (React-devtools hint + HMR only).

`tsc --noEmit` clean; eslint clean (the `react-hooks/set-state-in-effect`
rule caught a synchronous reset in the timer effect — resolved with the
render-phase reset described above).

No unit test added: like A4, A5's logic is view-state (beat timer + fade,
failed-stage branching) with no extractable pure helper — covered by the
Playwright pass.

## Open for the design-architect pass

- **Copy** — beat titles/asides and the failed copy are the prototype's
  placeholders, pending the Step 6 copy pass (still 🟣 in status).
- **Reshape-failure routing.** Today A4's honoring moment returns to its
  input stage on failure (the A4 chunk's stop-gap, "A5.b's territory").
  Now that A5.b exists, whether the deferred reshape path should adopt A5
  for its failure surface is a wiring/design call — flagged, not silently
  changed, since the reshape path is fast text-only and the holding
  behavior may be intentional.
- **Long-latency (>30s) beat-4, success-out cross-fade to A6, repeat-view
  compressed copy** — all prototype V2 backlog, out of scope for V1.

## Design-architect amendments (2026-06-12, applied to both files)

Eight notes from the polish pass, applied to production + prototype and
re-verified in browser. Several items the architect raised against the
prototype were **already correct in production** (it read the prototype,
which lagged) — noted inline.

1. **Title reflow on beat swap (top priority)** — the centred group jumped
   up when 2-line beat 2 → 1-line beat 3. Fixed: `min-height: 90px` on the
   title (36px × 1.25 × 2) + flex-centre within it. Verified: title height
   90px and stone top identical on both beats (`stoneShift: 0`). One-off,
   not tokenised.
2. **Dim-swap never reached its trough** — the cross-fade transition was
   `--duration-medium` (800ms) but the JS swaps text at 400ms, so copy
   changed at half-opacity (a blink). Fixed: transition → `--duration-small`
   (400ms) so dim-out completes exactly at the swap; trough deepened
   `0.3 → 0.2`. Verified the title dips and recovers around each swap.
3. **Reduced motion landed on the weakest frame** — prototype *paused* the
   atmospheric loops at 0% (every breath's trough). Fixed: pin each loop to
   its 50% peak (glow 1/scale 1.04, halo .20/1.08, body 1.04, shimmer .70).
   Production only has the CSS glow loop (canvas carries the stone); its pin
   moved from a mid `.92/1.02` to the peak `1/1.04` to match. Verified
   glow opacity 1 under reduced motion. *Also caught:* the prototype's
   reduced-motion entrance zeroed animation *duration* but not the staggered
   *delay*, leaving elements on their `opacity:0` base for up to 0.7s —
   zeroed the delay too (production already uses `animation: none`).
4. **Reassurance was the least legible line** — "Your note is kept." was
   14px tertiary (below the 16px floor + under contrast for 45–70). Fixed:
   `--text-body` (16px) + `--color-text-secondary` (#6B6B6B). Both files.
5. **Failed actions above the thumb zone** — retry floated mid-frame. Fixed:
   `.gen__actions { margin-top: auto; margin-bottom: var(--space-3xl); }`
   so stone+copy stay top-anchored and the recovery tap drops to the lower
   third. Verified both actions stay within the phone frame.
6. **Working stone read near-static — RESOLVED via speed, not amplitude
   (owner call).** The architect proposed 2.5% → 4% travel, but on a long
   stare the eye reads *cadence* more than *reach* (2.5% radius delta over
   6s ≈ 1.4px past a 4% baseline — below the perceptual floor). So instead
   of swelling the breath we **quickened it**: the shared engine's `working`
   `breathSpeed` 6000 → **4800** (amplitude unchanged at 0.02). 4.8s is
   clearly livelier than the old 6s yet still slower than ready's 4s, so it
   stays "patient processing." This is the **shared** canvas state, also
   used by **RecordScreen** (session setup / voice shaping) — re-checked at
   `/dev/breath-stone` (Working); the faster breath reads consistent in that
   "we're working on it" context. Prototype CSS mirrors it (4.8s, 2.5%). A
   side-by-side perception aid lives at `.tmp/stone-breath-compare.html`.
7. **Cadence front-loaded** — 4s/9s let the ~1.5s entrance eat beat 1.
   Pushed to 5s/10s (both files). Beat 3 is the terminal hold (see #8).
8. **Cross-state copy echo — RESOLVED.** Beat 3 was "Almost there." /
   "Nothing is lost." — the aside doubled as the no-note failed aside (echo
   on a fail transition) and "Almost there." over-promised imminence on what
   is an indefinite terminal hold. Rewritten to **"Almost in your voice." /
   "The right words take a moment."** — ties to the product's whole point
   (the message *in their voice*), carries no false clock, and frees
   "Nothing is lost." to live only on the failure state where it belongs.
   Still placeholder-grade pending the formal copy pass, but no longer
   conflicting. (`COPY_BEATS[3]` in both files; dev-rail labels updated.)

Accessibility (architect's omissions list): production **already had** the
stone `aria-hidden` and the `.btn` focus ring; added to the prototype. The
per-beat `aria-live` was replaced in **both** with `aria-busy` on the stage
+ one sr-only `role="status"` ("Creating your message.") so a screen reader
gets a single processing signal, not a re-announcement every ~5s. The
`--shadow-focus-ring` token the architect cited exists only in the proto-
types' `:root`, not production `@theme` — production keeps the literal ring
value (a `var()` ref would collapse to no ring; reconciliation drift).

Optional polish taken: the stone entrance is now a scale-bloom (0.94 → 1),
reading as *materialising* rather than sliding. Re-verified at 4× CPU
throttle: avg 8.3ms / worst 9.4ms.

## Status

- [x] Pure screen + dev page built — first design pass done
  (`/dev/messages-generation`; screenshots in `.tmp/a5-*.png`)
- [x] Design-architect polish pass applied + re-verified (prototype +
  production; screenshots in `.tmp/a5-v2-*.png`, `.tmp/a5-proto-v2-*.png`)
- [x] Working-stone breath resolved (speed → 4.8s, shared engine;
  RecordScreen re-checked) + beat-3 copy deconflicted (#6, #8)
- [ ] Owner visual pass on the breath speed + beat-3 copy (live)
- [ ] Forward-flow wiring (A3→A4→A5→A6) — lands with the A3 chunk
- [ ] Commit (awaiting go-ahead)
