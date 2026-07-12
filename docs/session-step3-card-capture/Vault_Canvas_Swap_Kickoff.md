# Vault — Canvas Rig Swap · Kickoff (fresh-thread entry point)

**Read this first in a new thread.** It hands off the next chunk: replacing the
Step 3 **composited-SVG vault** with the redesigned **Canvas 2D Bronze Vault rig**.
The SVG Step 3 build (Pass 1–3) is done and on **PR #73**; this chunk evolves it.

---

## 0 · How to start (paste into the fresh thread)

> Read `docs/session-step3-card-capture/Vault_Canvas_Swap_Kickoff.md`. We're
> swapping the SVG vault for the new canvas rig at
> `/Users/oremi/Downloads/Bronze Vault Palette - All Stages.html`. First pull the
> rig into the repo and distill the engine; answer the 3 open questions in §4;
> then plan the component before touching the seal. Don't widen scope silently.

---

## 1 · The source

- **`/Users/oremi/Downloads/Bronze Vault Palette - All Stages.html`** — 1.78 MB,
  a Canvas 2D showcase that triples the engine for display. The real deliverable
  is one engine: **`drawVault(ctx, vx, vy, size, t, pal)`** + a palette object,
  with states establish / confirm-hold / sealed and ember cool / ignited, and an
  internal "breath grammar" (~3.5s cycle). First step: copy it into `prototypes/`
  (design source of truth, per CLAUDE.md) and extract the engine **once** (dedupe
  the 3× showcase), stripping the code-as-text display blocks.
- Palette overlaps the tokens already in `@theme` (`#8c8174`, `#f3d9a4`,
  `#fbe6c0`, `#d9a85a`, `#5f574c`…) — color side is largely reconciled; new hexes
  go to `@theme` first, then mirror to `design-tokens.md` (never the reverse).

## 2 · The interface it must honor (already built — drop in behind it)

- **`src/components/screens/step3/VaultObject.tsx`** — the one shared vault.
  Props: `phase: 'establish'|'confirm-hold'|'sealed'`, `emberState: 'cool'|'ignited'`,
  `decorative?`. Reused by CardCapture's seal, Processing, and the seal stack.
- **The seal already separates timing from presentation** (Decision D4):
  `useSealTimeline.ts` is the shell (closing→catching→settling→sealed→handoff,
  `onSealed` at ~1675ms → dwell 2500 → crossfade). Today the seal crossfades
  **three** SVG layers (`.v-establish` / `.v-sealed-cool` / `.v-sealed`,
  `SealStage.tsx` + `globals.css .step3-seal`). **The cleaner canvas integration:
  ONE canvas plays the iris-close internally and signals `onSealed`** — exactly
  the interface `useSealTimeline` already consumes. Replace the 3-layer crossfade,
  keep the shell.
- **The seam (don't break):** CardCapture's settled frame must be pixel-identical
  to Processing's mount frame — both render the same sealed vault in the same
  `.step3-ceremony` geometry.
- Shimmer is a separate ground layer (`useShimmerLoop.ts`) — the vault never reads
  it. Decision register: `docs/session-step3-card-capture/Step3_Build_Decision_Register.md`.

## 3 · What this reverses (intended, not a contradiction)

Decision **D1** shipped SVG and deferred the canvas swap *because the rig didn't
exist and SVG cleared 60fps*. The rig now exists and the owner wants it — so the
swap is the planned evolution. Keep it a separate chunk so PR #73 (SVG) stays
independently reviewable; decide branch vs fold-onto-#73 with the owner.

## 4 · Open questions — get owner answers before building

1. **The breath.** The rig has an internal ~3.5s breath, but Motion Spec §5 says
   the vault is **dead-still** through the Processing wait (only the ground
   shimmer moves). Plan: render the rig's frames + the iris-close, but **suppress
   the idle breath in Step 3**. Confirm — or is the breath meant to show during
   processing (a spec change)?
2. **Reduced motion.** Canvas is harder to freeze than SVG. Plan: render a single
   static settled frame for RM. Confirm.
3. **The reds in the palette** (`#ff8a80`, `#5c2b2e`): a vault error/declined
   state, or for other screens? Need it to map states correctly.

## 5 · Verification bar (unchanged from Pass 2/3)

- `tests/e2e/seal.spec.ts` + `processing.spec.ts` stay green (15 passing, 1
  gated-skip). The DOM contract (`#stage[data-phase]`, the three `.v-*` layers,
  `#shimmer`) may need updating if the seal becomes one canvas — update the spec
  with the implementation, keep the assertions.
- **60fps @ 4× CPU throttle, 390×844** — **measure against a production build**
  (`next start`), not `next dev` (dev inflates the worst-frame tail; see
  `FOLLOW_UPS` #73). Canvas perf is the thing to watch on the iris-close.
- Seam pixel-identity; RM static frame; zero console errors.

## 6 · Status carried in

- PR **#73** = the SVG Step 3 build (Pass 1–3 + design-lens fixes + decision
  register). Not merged. This chunk can branch off it or fold in — owner's call.
- Carried-open: `--ease-seal-iris` placeholder (the rig may supply the real
  curve); FOLLOW_UPS #69 (notify infra), #72 (Processing progression reducer),
  #73 (e2e/motion-perf not in CI). Production wiring is roadmap **M4**, after
  M3 (Settings, error states) — `docs/Roadmap_Phase1_Phase2.md`.
