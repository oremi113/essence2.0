# Step 3 — Token prep for `@theme` (provisional, pre-pineapple)

> **Superseded by `palette-token-reconciliation.md` (2026-06-28).** The palette is now
> **locked** (FU #65 — see the Bronze Vault deck) and the shimmer mechanism + curves are
> **resolved** by the authoritative Pass 3 prototype. The reconciliation memo holds the
> canonical drop-in `@theme` block; paste from there at Pass 1. This file is kept for the
> rationale and the staging history — its values below are updated to match Pass 3, but it is
> no longer the source of truth.

**What this is.** The token block production **Pass 1** pastes into `src/app/globals.css`
`@theme` when the build opens (pineapple). It is **not** pasted yet — pineapple gates code,
and the colors are still being tuned with the design architect. This file is the staging
area so the values live in one place and the screen never carries raw hex.

**The discipline (why this file exists).** Canonical token source is `globals.css @theme`
(Build Handoff §0.4 — the Step 7 drift trap is treating a *doc* as canonical, so the motion
spec's "add to `design-tokens.md`" is the stale, mirror-only instruction). Provisional
*values* are fine; a provisional *location* is not. The token **name** lands in `@theme`
from Pass 1; the **value** is swappable in one place when the design-architect palette thread
locks it (FOLLOW_UPS #65). The screen consumes `var(--token)` only — never a raw hex or rgba.

---

## Tokens to add at Pass 1 start

```css
/* ─── STEP 3 VAULT + SHIMMER (anchors locked FU #65; full ramp in reconciliation memo) ─── */

/* Shimmer ground primitive. Ships at 0 in Pass 1 (token exists, nothing animates it);
   Pass 2 sets it to faint at the seal settle; Pass 3 wired the full map + loop. Single
   OPACITY-driven token over a fixed gradient — NO radius, NO second token (the palette
   deck's constant-alpha + radius proposal was not adopted). See ESSENCE_Step3_Motion_Spec.md
   §2, §4. */
--shimmer-intensity: 0;

/* Shimmer ground color as an RGB triplet, consumed rgba(var(--color-glow-warm-rgb), <a>).
   COMMA-separated — confirmed against Pass 3 + the legacy rgba() consumer (no space-separated
   rgb(var()/a) precedent in globals.css). */
--color-glow-warm-rgb: 214, 162, 92;

/* Vault anchor colors — LOCKED (greige/reliquary, FU #65). The provisional #7A8088 / #D9A85A
   are superseded. Full multi-stop ramp (case/interior/ember/halo) lives in the
   reconciliation memo, not here. Name --color-vault-bronze is historical: its value is now
   the greige dormant base, == --vault-case-cool-1. */
--color-vault-bronze: #888278;  /* cool / dormant base · Greige (locked) */
--color-vault-ember:  #f3d9a4;  /* ignited ember core (locked) */
```

## Intensity values (Pass 3 — validate on oat)

Pass 1 ships `--shimmer-intensity: 0`. The per-state values below are now **resolved by Pass 3**
(no longer proposals) — recorded here so the build doesn't re-invent them:

| Register | Value | States |
|---|---|---|
| faint | `0.05` | seal settle, `processing-normal`, `post-seal-support` |
| active | `0.12` | `processing-extended`, `processing-notify-handoff`, `notify-landing` (loop ceiling) |
| neutral-exit | `0.025` | Processing exit → the neutral handoff frame. **Pinned (Pass 3 lock 2)** — a separate value from RM rest. |
| RM rest | `0.05` | `reduced-motion` — static **faint** rest (motion-spec §6; **not** `0.03`) |
| breath loop | sine, period `7000ms`, dip `0.25` | ambient; the state value is the ceiling, the sine only dips below it (active breathes ~0.09→0.12). On-device dial. |

> The earlier `0.03` "neutral" conflated two different frames: the **RM rest** (a static faint
> resting state → `0.05`) and the **neutral handoff exit** (now pinned → `0.025`). They are
> distinct values, as insisted — Pass 3 confirmed the split.

**Caveat — surface-dependent, mechanism now settled.** These were read on the prototype's
ground; the production ground is the **light oat surface at 390×844**. Shimmer on oat uses
plain `opacity` — **no `screen` blend** (`screen` is only right on dark ceremonial surfaces).
The **mechanism is resolved**: a single opacity-driven `--shimmer-intensity` over a fixed
gradient, with the breath as an intensity multiplier — *not* the palette deck's radius
approach (Pass 3 carry-forward contract). The **numbers** may still move ± when tuned
on-device, but the token and the mechanism are locked.

---

## Sequencing

1. **Now (pre-pineapple):** palette **locked** (FU #65); shimmer map + curves **resolved**
   (Pass 3). Canonical drop-in block lives in `palette-token-reconciliation.md`. Nothing in
   `@theme` yet — pineapple still gates code.
2. **Pass 1 (pineapple):** paste the reconciled block into `globals.css @theme` (anchors +
   full ramp + `--shimmer-intensity` at `0` + all three seal curves). The screen consumes
   `var(--…)` — no raw hex.
3. ~~Design-architect thread (FU #65)~~ — **done.** Bronze Vault deck locked the palette;
   brief was `vault-palette-design-brief.md`. Shimmer mechanism + curves locked by the Pass 3
   prototype. Reconciled in `palette-token-reconciliation.md`.
4. **Remaining swaps (one place, no screen edits):** `--ease-seal-iris` real value (vault
   thread still owes it; ships on the `--ease-essence` placeholder) and `--ease-seal-exit`
   tail tuning toward `(0.4, 0, 0.15, 1)` on oat.
