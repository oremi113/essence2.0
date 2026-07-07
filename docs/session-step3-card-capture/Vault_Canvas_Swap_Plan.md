# Vault — Canvas Rig Swap · Findings, Decisions & Build Plan

**Branch:** `step3/vault-canvas-swap` (off `step3/build-prep` / PR #73 — the SVG
build stays independently reviewable; this is the planned canvas evolution, D1
reversal per kickoff §3).
**Entry point:** [[Vault_Canvas_Swap_Kickoff.md]]. **Status:** BUILT & verified
(not yet committed). Engine split + canvas VaultObject + single animated seal
canvas landed; 346 unit + 15 e2e (1 gated-skip) green; perf gate clears at 4×
(15.8ms median); zero console errors. See §5 for the commit breakdown.

---

## 1 · The rig, distilled

The source (`prototypes/bronze-vault-palette-all-stages.html`, 1.78 MB) is an
**iframe showcase**: three `stage-N` tabs, each an embedded HTML doc whose engine
is **gzip+base64-compressed** inside a `__bundler/manifest`. Unpacked, all three
`vaultEngine.js` are **byte-identical** (19,987 B) — the "3× showcase" is one
engine tripled for display.

- **Distilled artifact:** `prototypes/vault-canvas-rig.html` — the single engine
  + the canonical `RELIQUARY` palette + breath driver + reduced-motion handling
  + a `t`-scrubber, on the oat surface. This is the runnable **design source of
  truth** for the swap. Verified in Playwright: cool grey at t=0, warm bronze +
  lit pilot at t=1, no console errors (favicon 404 only).
- **Engine interface:** `drawVault(ctx, vx, vy, size, t, pal)`, transparent
  background, composites onto oat. **`t` is a single continuous axis:
  0 = cool/dormant/establish → 1 = ignited/sealed.**
- **Palette:** one locked `RELIQUARY` object (RGB triples). Color is already
  reconciled — `glowRGB:[214,162,92]` === the locked `--color-glow-warm-rgb:
  214,162,92`. New hexes (if any surface during the split) go to `@theme` first,
  then mirror to `design-tokens.md`.

---

## 2 · The three open questions (kickoff §4) — resolved

**Q1 · Breath → routed to the shimmer ground.** The rig's "~3.5s breath" is NOT
vault-body motion: the driver calls `drawVault` at a **constant `t`** and the
breath envelope modulates only `radiusFrac` — the **ambient glow halo radius**
behind the vault. Metal/rings/ember never move. Motion Spec §5 ("vault dead-still")
is honored by construction. **Decision DC2:** in Step 3 the vault renders at a
**fixed** glow radius; the breath energy folds into the existing shimmer ground
layer (`useShimmerLoop`), not the vault. The vault never moves.

**Q2 · Reduced motion → confirmed, the rig already does it.** The rig's driver
checks `prefers-reduced-motion` and paints a **single static settled frame**
(`t:1`, no RAF). Production mirrors this via `useReducedMotion()` → static t=1.

**Q3 · The reds (`#ff8a80`, `#5c2b2e`) → NOT a vault state.** They appear only as
the showcase's **dev error-toast styling** (`background:#2a1215; color:#ff8a80;
border:1px solid #5c2b2e; z-index:99999`) — harness chrome, absent from the
engine and every palette. Stage-0's own copy lists the unsealed states as
"establish, confirm-hold, park, **checkout-error**" → **checkout-error reuses the
cool/dormant vault (t=0)**, not a red. Do not mint a red state.

---

## 3 · Decision memos (this chunk)

**DC1 — Split the engine's `t` into `mechT` + `emberT`.** *(approved)*
The rig's `t` is one coupled warmth ramp: warmth, lit-core (`t>0.08`), and
ember-body all ride the same axis, while the aperture barely moves (rings
contract ~6px, spokes extend ~7px, the ember boss *grows*). Motion Spec §3
requires a **two-beat** grammar — `IRIS CLOSE` (0–800ms, mechanical, ember stays
**cool**) → +175ms → `EMBER CATCH` (cool→ignited). The single `t` **cannot**
produce a cool-close-then-catch: any `t` high enough to read as "closing"
already warms the ember.

> **Divergence from the design source of truth, by explicit decision** (CLAUDE.md
> "prototypes are authoritative; production diverges only by memo"). The engine
> split is mechanical, not aesthetic: the cool & ignited *frames* the rig
> produces are unchanged — we only let the seal drive warmth and mechanism on
> separate clocks so the existing, already-reviewed two-beat shell
> (`useSealTimeline`) stays untouched. Chosen over (A) adopting the rig's
> cross-warm as the seal (would rewrite Motion Spec §3, drop the cool-close beat)
> and (B) an iris-close overlay composited over the rig (more moving parts, two
> sources of truth for the same motion).

**DC2 — Breath routed to the shimmer ground (Q1 above).** Vault dead-still; the
glow-radius pulse becomes shimmer-ground energy via the existing
`--shimmer-intensity` primitive. No new token. No vault motion.

**DC3 — No red/declined vault state (Q3 above).** checkout-error = cool vault.

**DC4 — Reduced motion = static t=1 frame (Q2 above).** No RAF; the canvas paints
once. Mirrors the rig's own RM path.

**DC5 — No per-frame `ctx.filter` blur (perf).** *(forced by the 4× gate)*
The single animated canvas redraws the full vault every frame on the iris-close;
the rig's per-frame `ctx.filter='blur()'` passes (1 large case drop-shadow + 3
ring contact-shadows) blew the budget — **35.8ms median (~28fps) at 4× CPU**.
Canvas filter-blur re-rasterizes each frame and is the known bottleneck. Fix:
bake the case shadow's blur **once** into a static layer (composited per-frame
with the animated alpha + lift, at blit cost) and feather the ring shadows with
**radial gradients** instead of a blur pass. Result: **15.8ms median (~63fps),
worst 28.8ms** — clears the gate, visually identical (the drop shadow is
unchanged to the eye). Divergence from the rig's draw, by perf necessity; the
rig was a showcase that never ran a per-frame redraw under throttle.

---

## 4 · The engine `t`-split (DC1) — design

`drawVault(ctx, vx, vy, size, t, pal)` → `drawVault(ctx, vx, vy, size, drive, pal)`
where `drive` is either a scalar `t` (back-compat: `mechT = emberT = t`) or
`{ mechT, emberT }`. Inside the engine, the existing locals split by axis:

- **`mechT` drives** (geometry/mechanism, cool-readable on its own): `rc` (ring
  contraction `mR`/`iR`), spoke `sO`/`sw`/`so`/`capR`, `rimW`, the close-shadow
  geometry, `hlSharp`.
- **`emberT` drives** (warmth/ignition): `w` (metal warm blend), `glow` /
  `stoneGlow` / `glowExtent` / `haloExtent`, `coolWash`, the ember body lerp
  (`SC.*`), the **lit core** (`t>0.08` gate), interior warm tint, ember-cast
  interior light, inter-ring glow, aura.
- **Shared/ambiguous** (decide per-line during build, default to `emberT`):
  `caseHL`, `intDark`, `csDep`/`intVig`. These read as "the case warming," so
  `emberT`.

The amplitude question to settle on-canvas during the build: the rig's aperture
motion is subtle (~6–7px). If the cool `IRIS CLOSE` beat doesn't *read* as
"drawing shut" at `mechT` 0→1, amplify the spoke sweep / ring contraction **in
the engine** (still DC1's remit — a geometry tuning, memo-covered). Target the
prototype's Pass-2 close feel.

Seal timeline → engine mapping (`useSealTimeline` unchanged):
```
closing  (0–975)    mechT: 0→1 (--ease-seal-iris)   emberT: 0 (cool)
catching (975–1375) mechT: 1                          emberT: 0→1 (--ease-seal-ember)
settling (1375–1675) both pinned at 1 (micro-settle)
sealed/handoff      both 1 (dead-still); shimmer ground rises
```
`--ease-seal-iris` is still a placeholder (Motion Spec §2, kickoff §6) — the rig
may supply the real curve; decide during the build and drop a
`docs/analytics`-style note only if it shifts timing.

---

## 5 · Component plan (build order — separate chunks, extract-then-test)

1. **Engine in `src/lib/vault/`** (primitive, reusable across screens — CLAUDE.md
   layering). Port `prototypes/vault-canvas-rig.html`'s engine to a typed module
   `vaultEngine.ts`; palette → tokens. Pure, no React, no Supabase. *Commit 1.*
2. **`VaultObject` → canvas.** Same props (`phase`, `emberState`, `decorative`).
   Maps phase→`{mechT,emberT}`, paints a DPR-aware `<canvas>`. `establish`/
   `confirm-hold` = cool frame; `sealed` cool = closed-not-caught; `sealed`
   ignited = lit. RM = static t=1 (DC4). *Commit 2 (+ tests, commit 3).*
3. **Collapse the 3-layer crossfade → ONE canvas** driven by `useSealTimeline`.
   The canvas plays iris-close internally and the phase clock drives
   `{mechT,emberT}`; `onSealed` fires at 1675ms exactly as today. Retire
   `.v-establish`/`.v-sealed-cool`/`.v-sealed` and their `globals.css` crossfade.
   **Update `seal.spec.ts` DOM contract WITH the implementation** (the three `.v-*`
   layers collapse to one `<canvas>`; keep every behavioral assertion —
   onSealed timing, seam identity, ember/shimmer readouts).
4. **The seam (don't break):** CardCapture's settled frame and Processing's mount
   frame both render the sealed canvas in the same `.step3-ceremony` geometry →
   pixel-identical. Add a seam pixel-diff to the e2e if cheap.
5. **Breath → shimmer ground (DC2).** Confirm `useShimmerLoop` carries the living
   quality; vault stays at fixed glow radius.

**Verification bar (kickoff §5, unchanged):** `seal.spec.ts` + `processing.spec.ts`
green; **60fps @ 4× CPU, 390×844, measured against `next start`** (not `next dev`
— FU #73); seam pixel-identity; RM static frame; zero console errors. Canvas perf
on the iris-close is the thing to watch.

**Out of scope (unchanged):** production wiring is roadmap M4 (after M3); the
Reveal; the Processing timed-progression reducer (FU #72).
