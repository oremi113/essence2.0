# Step 3 · Pass 3 — Design Brief (Ambient Shimmer + Neutral Handoff)

**For:** the vault design-architect thread.
**Surface to build:** a **new** prototype file, `essence-step3-processing-pass3.html`,
built on Pass 2 (`essence-step3-seal-pass2.html`) — same tokens, same seam unit, picking
up where the seal settle ends. Not an edit of the seal file (that stays the locked hero
reference; `seal.spec.ts` is pinned to its DOM contract).

**Specs this implements:** Motion Spec §4 (shimmer activation map), §5 (Processing motion +
exit), §7 (the neutral handoff contract), §6 (RM shimmer rest). Build sequence: Build
Handoff §9.4.

---

## What Pass 3 covers

The **calm wait**, not the commit moment. Pass 2 ended at the seal settle with shimmer
just ignited to faint. Pass 3 carries that ground forward through the whole Processing
rail and hands off to the Reveal:

1. The `--shimmer-intensity` **faint → active climb** and the slow **sine loop** (ambient,
   not an ease).
2. The **full activation map** across every Processing state (table below).
3. **Processing stillness** — vault dead-still, ember static-ignited; the *only* motion is
   the ground shimmer.
4. The **exit ease-down to neutral** when generation completes (§5).
5. The **RM shimmer rest** frame (§6).
6. The **neutral handoff contract frame** (§7) — the explicit, nameable rest state the
   Reveal builds from. Pass 3 builds *to* it and **stops**.

---

## Carry-forward contract — reuse byte-identical (this is where the last rounds drifted)

Pass 3 **extends**, never re-forks. Three things must be identical to Pass 2 / canonical:

- **The shared seam unit `#vault-sealed`.** Processing mounts the *same* sealed vault,
  dead-still. Do not redraw it; do not animate the vault object.
- **The canonical token block** — same `--shimmer-intensity`, `--color-glow-warm-rgb`,
  `--ease-seal-ember`, mirrored to the `globals.css @theme` values. **No new parallel
  token.** Pass 3 drives *new values and a loop* through the *existing* `--shimmer-intensity`;
  it does not mint a second intensity token. (Recurring failure mode — three rounds running.)
- **The neutral handoff frame** as a real state, not an implicit end-of-animation position.

If Pass 3 needs a genuinely new curve for the exit ease-down, **flag it** (the
`--ease-seal-ember` / `--ease-seal-iris` pattern) rather than inventing one silently — see
the open decision below.

---

## The shimmer activation map (Motion Spec §4 + token-prep values)

Intensity *is* the meaning: faint = waiting, active = working. Ground layer only.

| State | `--shimmer-intensity` | Note |
|---|---|---|
| Seal settle (Pass 2 end) | `0 → 0.05` (faint) | the entry point Pass 3 inherits |
| `processing-normal` | `0.05 → climbing` | the wait has begun |
| `processing-extended` | `0.12` (active) | working — or silent retry; user can't tell, by design |
| `processing-notify-handoff` | `0.12` (active) | still working in the background |
| `notify-landing` | `0.12` (active) | cold-start deep-link; restores context |
| `post-seal-support` | `0.05` (faint, low calm) | held, not abandoned — drops but never to 0 |
| **Processing exit (gen complete)** | `0.12 → neutral` | released calm; eases down via the exit curve (§5) |
| RM rest | `0.05` static | static **faint** frame, never the trough, never `0.03` |

> Values are **start points**, ratified on the prototype's *dark* ground. Production is the
> **light oat surface at 390×844, plain `opacity`, no `screen` blend.** A warm glow at
> 0.05–0.12 may read differently there — the numbers, and possibly the *mechanism*, move
> once tuned on-device. This is the Pass 3 tuning job.

---

## The neutral handoff frame (§7) — the boundary to the Reveal

The frame Pass 3 ends on and stops:

- Vault sealed, ember lit and **static**.
- Shimmer at **neutral / low rest**.
- Ground calm — **no warmth poured.**

Rules: Processing owns a self-contained exit *to* this frame and stops; it never animates
into the pour. The Reveal owns the pour and builds *from* this frame whether or not
Processing's exit just played (a notify deep-link can land a cold session straight into the
Reveal). **Warmth lives only on the Reveal side of this boundary.**

---

## Must NOT do

- **No pour.** Processing's exit is tension release (shimmer settling, luminance
  neutralizing), not warmth leaving the vessel. The pour is the Reveal's, entirely
  (§SEAL-INTEGRITY). If Processing's exit pours, the Reveal underdelivers.
- **No vault motion.** Shimmer is ground-layer only. The vessel and ember are dead-still
  through the entire wait.
- **No `screen` blend** on the oat surface (it's only right on dark ceremonial grounds);
  **no `brightness()`** anywhere; `--ease-breath` is Stone-only.
- **No dependency on the real iris rig.** During Processing the vault is static, so the
  **stub `#vault-sealed` is sufficient.** Pass 3 is unblocked even while the rig is still
  in build.
- **No re-pay control** anywhere in Processing — payment is confirmed before entry.

---

## One open decision to make in Pass 3

**The neutral-exit intensity value.** token-prep deliberately leaves this open — it is a
*separate* value from the RM faint rest (`0.05`). The earlier `0.03` conflated the two
frames; don't reuse it. Pick the neutral-exit luminance on-device against the oat ground,
and decide whether the exit ease-down reuses `--ease-page` (canonical `cubic-bezier(0.22,1,
0.36,1)` — re-judge it, it's a fast-out, the same lesson that moved the ember off it) or
wants its own curve. Flag it as an explicit fork either way.

---

## Verification bar (Pass 3, Build Handoff §9.4 / Motion Spec §8)

Full Playwright sweep across both rails at 390×844, 4× CPU throttle, 60fps, zero console
errors. Specifically: the shimmer loop holds 60fps at `active` intensity; a cold-start
deep-link into Processing renders the right state via re-fetch (never blank, never paywall);
a cold-start deep-link into the Reveal builds from the neutral frame with no dependency on
Processing's exit; RM renders every resting frame with zero animation, ember static. The
`seal.spec.ts` harness in this folder extends to cover these (it already asserts the seam
and the shimmer onset).
