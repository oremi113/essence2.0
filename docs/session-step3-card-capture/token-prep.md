# Step 3 — Token prep for `@theme` (provisional, pre-pineapple)

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
/* ─── STEP 3 VAULT + SHIMMER (provisional — pending design palette thread, FU #65) ─── */

/* Shimmer ground primitive. Ships at 0 in Pass 1 (token exists, nothing animates it);
   Pass 2 sets it to faint at the seal settle; Pass 3 wires the faint→active→neutral map
   and the loop. See ESSENCE_Step3_Motion_Spec.md §2, §4. */
--shimmer-intensity: 0;

/* Shimmer ground color as an RGB triplet, so the gradient can vary alpha:
   rgba(var(--color-glow-warm-rgb), <a>). Provisional honey. */
--color-glow-warm-rgb: 214, 162, 92;

/* Vault object colors. Provisional — the real bronze/ember palette + the full multi-stop
   gradient ramp are owned by the design-architect thread (FU #65). These are anchor colors
   only; the radial ramp is finalized alongside the palette. */
--color-vault-bronze: #7A8088;  /* cool / dormant ember base (provisional) */
--color-vault-ember:  #D9A85A;  /* ignited ember core (provisional) */
```

## Ratified intensity values (proposals — validate on-device)

Pass 1 ships `--shimmer-intensity: 0`. The per-state resting values below are the ratified
**start** values for Pass 2 (faint) and Pass 3 (the full map) — recorded here so Pass 2/3
don't re-invent them mid-build:

| Register | Value | States |
|---|---|---|
| faint | `0.05` | seal settle (Pass 2 target), `processing-normal`, `post-seal-support` |
| active | `0.12` | `processing-extended`, `processing-notify-handoff`, `notify-landing` |
| RM rest | `0.05` | `reduced-motion` — static **faint** rest (motion-spec §6; **not** `0.03`) |
| neutral-exit | *(Pass 3 call)* | Processing exit → the neutral handoff frame. A **separate** value from RM rest — do not pin yet. |

> The earlier `0.03` "neutral" conflated two different frames: the **RM rest** (a static
> faint resting state → `0.05`) and the **neutral handoff exit** (a Pass 3 luminance target,
> still open). They are not the same value.

**Caveat — start values, surface-dependent.** These were read on the prototype's ground; the
production ground is the **light oat surface at 390×844**. Shimmer on oat uses plain
`opacity` — **no `screen` blend** (`screen` is only right on dark ceremonial surfaces) — so a
warm glow at `0.05`–`0.12` may read differently, and the numbers (and possibly the
*mechanism*) will move once tuned on-device in Pass 3.

---

## Sequencing

1. **Now (pre-pineapple):** values tuned here; nothing in `@theme` yet.
2. **Pass 1 (pineapple):** paste the block into `globals.css @theme`. `--shimmer-intensity`
   ships at `0`; vault colors provisional; the screen consumes `var(--…)` — no raw hex.
3. **Design-architect thread (FU #65):** lock the real bronze/ember palette + gradient ramp +
   on-oat shimmer intensities. Brief: `vault-palette-design-brief.md` (this folder).
4. **Swap:** replace the provisional values in `@theme` — one place, no screen edits.
