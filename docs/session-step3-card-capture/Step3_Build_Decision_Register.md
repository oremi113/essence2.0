# Step 3 — Build Decision Register

**Date:** 2026-06-29 · **Branch:** `step3/build-prep` · **PR:** #73
**Scope:** the locked engineering decisions made *during* the Pass 1–3 build (the
build sequence §9.5 deliverable). The design decisions made *before* the build
live in the handoff (`ESSENCE_Step3_Card_Capture_Build_Handoff.md` §2) and the
motion spec; this register only records calls the build itself had to make, and
why, so the next maintainer does not re-litigate them.

Format: **D# — decision · rationale · where it lives · how it's verified.**

---

## Architecture & components

**D1 — Seal animates as composited SVG/CSS, not a canvas rewrite.**
The prototype's Pass 2 note called for an SVG→canvas swap. We kept SVG and drove
the seal with GPU-composited opacity/transform transitions instead. Rationale:
the seal is geometric (opacity crossfade of three layers + a micro-settle scale)
— all compositor-friendly; the reduced-motion settled frame is then *free* (just
render the sealed SVG); and it avoids a throwaway canvas engine. The escalation
condition was explicit: *go canvas only if 4× throttle can't hold 60fps.* It
held (production worst frame ~28ms), so SVG stands.
*Lives:* `SealStage.tsx`, `useSealTimeline.ts`, `.step3-seal` CSS.
*Verified:* `seal.spec.ts` perf gate, 4× throttle.

**D2 — One shared `VaultObject` primitive; the seal stacks three of it.**
The seam (CardCapture settled frame ↔ Processing mount frame) stays pixel-
identical because both render `VaultObject(phase:'sealed', emberState:'ignited')`
inside the same `.step3-ceremony` geometry. The seal's three opacity-gated
layers are the same component at `establish` / `sealed+cool` / `sealed+ignited`
— so the `sealed-cool` variant (case shut, pilot still cool) was added to
VaultObject rather than forked into a separate symbol.
*Lives:* `VaultObject.tsx` (`decorative` flag for stacked layers).
*Verified:* `seal.spec.ts` seam test (vault opacity continuous across handoff).

**D3 — `VaultObject` is memoized.**
Surfaced by the design-lens review: every seal phase flip was re-reconciling all
three full SVGs (~15 nodes each), and that reconcile — not paint — was the
worst-frame hitch at the iris-close onset. `memo` + constant props means the
layers render once and skip on phase changes. Paired with `will-change: opacity`
on the layers (promote at mount, not on the first animated frame).
*Lives:* `VaultObject.tsx`, `globals.css .step3-seal .v-*`.
*Verified:* production worst frame ~28ms (was ~50, straddling the gate).

**D4 — Timing split from presentation.**
`useSealTimeline` and `useShimmerLoop` own all timing (rAF + setTimeout);
`SealStage` / `Processing` are presentational. Both hooks are step3-specific and
colocated under `screens/step3/`, matching repo precedent
(`screens/shelf/usePlaybackController.ts`); `src/lib/animation/` stays for
cross-flow generics.

---

## Motion & tokens

**D5 — The ~2.5s "Sealed" dwell is kept** (owner call carried from design, 2026-06-28).
The seal line holds ~2.5s after the settle before the copy crossfades to
"Preparing your voice." RM keeps the dwell beat (it is copy-pacing, not motion).
*Verified:* `seal.spec.ts` asserts `handoff - sealed > 2500ms`.

**D6 — Shimmer is one opacity-driven primitive; no second token is minted.**
`--shimmer-intensity` is the only token; the loop drives `base × breath` through
it. Per-state bases (faint 0.05 · active 0.12 · neutral 0.025 · RM rest 0.05)
and the breath/climb/exit numerics live in the screen (`useShimmerLoop.ts`), not
in `@theme` — by design (palette-token-reconciliation memo). The palette deck's
constant-alpha + radius proposal was **not** adopted.

**D7 — Neutral-exit intensity = 0.025** (Pass 3 lock 2). Distinct from the RM
faint rest (0.05) and clear of the retired 0.03 — "done" reads different from
"waiting," but above 0 so the Reveal has a warm ground to rise from.
*Verified:* `processing.spec.ts` neutral-exit boundary test.

**D8 — The exit ease-down uses `--ease-seal-exit`, sampled in JS for the rAF.**
The token (`cubic-bezier(0.4,0,0.2,1)`) is the source of truth; `useShimmerLoop`
re-samples it (Newton-Raphson) for the rAF exit. This dual home is guarded:
a unit test reads the token from `globals.css` and fails if the two diverge.
*Lives:* `useShimmerLoop.ts` (`EASE_SEAL_EXIT_BEZIER`), `tests/unit/step3-seal-exit-curve.test.ts`.

**D9 — `--ease-seal-iris` ships on its placeholder.**
Still the `--ease-essence` value; the tuned curve is owed by the vault design
thread. One-token swap when it lands, no screen edits. Tracked (FU #68 bucket).

---

## Prop-shape extensions

**D10 — Added `generation: 'ready'`.** The §3 enum gained `'ready'` (gen
complete) to drive Processing's exit to the neutral handoff frame. Minimal,
non-breaking extension; the frame it produces is a real, nameable boundary, not
an end-of-animation accident.

**D11 — Two dimensions ride outside §3 data, as their own props.**
- `Processing.entry: 'seal' | 'notify-deeplink'` — the §4 "entry" column; the
  only thing distinguishing `notify-landing` from `processing-normal`. A routing
  dimension, not data, so it is not forced into the §3 object.
- `CardCapture.isolate: 'loss-frame'` — a sandbox tuning aid (hides Beat 2 to
  tune the turn alone), mirroring the prototype's dev-rail toggle. Not a runtime
  state.

---

## Process & verification

**D12 — The 4× perf gate is engine-explicit and prod-measured.**
The gate skips explicitly on `browserName !== 'chromium'` (reads as "wrong
engine," never a silent green — the original WebKit-skip masked the unenforced
bar). The honest number requires a **production build** (`next start`): `next dev`
inflates the worst-frame tail with reconciler/HMR/compile overhead (one-off
~80ms spikes that are dev-only). Production: seal ~28ms, breath ~10ms worst.

**D13 — `notify-landing` cold-start re-fetch is gated, not faked.**
The state renders as a static shell (badge + active ground). Its cold-start
re-fetch verification depends on the transactional notify infra (FU #69), which
does not exist yet — so that assertion is a **skipped** test with a named gate,
not a stubbed green.

**D14 — Deferred work is logged, not silent.**
FOLLOW_UPS #69 (notify infra), #70 (trial reminder), #71 (elder sample), #72
(Processing live timed-progression reducer — `useShimmerLoop.CLIMB_DUR` is a
demo tween until real gen polling), #73 (e2e/motion-perf not in CI).

---

## Out of scope (by contract)

- **The Reveal.** It builds *from* the neutral handoff frame (D7); it is a
  separate screen/spec. Pass 3 builds *to* the contract frame and stops.
- **The confirm-hold / Processing timed state machine.** The poll-with-backoff
  and the normal→extended→handoff wait clock belong in a reducer (handoff
  NOTE-FOR-CODE-ARCHITECT #2); this build renders the discrete states (FU #72).
- **Backend / notify infra.** Layer 1/2, prerequisites — not this build (FU #69).
