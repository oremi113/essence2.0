# Step 3 — Palette ↔ Motion token reconciliation (handoff-ready)

**Date:** 2026-06-26
**Purpose:** Reconcile the *Bronze Vault Palette* design deck (color thread, FU #65) with
the *Motion Spec* and the authoritative *Pass 3 processing prototype*, so the `@theme`
swap is a true drop-in with no contradictions. Supersedes the provisional block in
[[token-prep]] and the `@theme` block inside the palette deck.

**Authority model used to break ties** (from CLAUDE.md):
- **Prototypes are the design source of truth.** `essence-step3-processing-pass3.html`
  (2026-06-26 19:05) is the newest artifact and the authoritative motion source. It wins
  on shimmer mechanism, shimmer values, and curves.
- **The palette deck owns color** (FU #65). It wins on every hex ramp.
- Where the deck stepped into motion (constant-alpha + radius shimmer), it is **superseded**
  — the deck's own acceptance check flagged that as "pending motion sign-off," and Pass 3
  is that sign-off.

---

## The four blockers — decisions

### B1 · Shimmer mechanism → **opacity via a single `--shimmer-intensity`. Radius dropped.**

The deck proposed constant alpha `--shimmer-alpha: 0.06` with rest/active carried by
**radius** (`--shimmer-r-rest/-active-min/-active-max`). Pass 3 explicitly rejects this:

> "One ground-layer primitive `--shimmer-intensity` … effective = base × breath, set on the
> ground layer only … **No second intensity token is minted** … (carry-forward contract)."

Pass 3's `.ground-shimmer` animates **`opacity: var(--shimmer-intensity)`** over a **fixed**
gradient geometry (`ellipse 80% 60% at 50% 44%`). Rest vs active vs exit is intensity ×
breath, **not** radius.

**Decision:** keep `--shimmer-intensity` (preserves the token-prep carry-forward contract —
name lands at Pass 1, value swaps in one place). **Drop** `--shimmer-alpha`,
`--shimmer-r-rest`, `--shimmer-r-active-min`, `--shimmer-r-active-max`. Per-state base
intensities (from Pass 3, supersede the token-prep table):

| Register | Value | Note |
|---|---|---|
| faint (waiting) | `0.05` | |
| active (working ceiling) | `0.12` | loop dips below it, never above |
| neutral (handoff exit) | `0.025` | **now pinned** — Pass 3 lock 2 (token-prep left this open) |
| RM rest | `0.05` | static faint, no loop (motion-spec §6) |
| breath loop | sine, period `7000ms`, dip `0.25` | active breathes ~0.09→0.12; on-device dial |
| exit | `1200ms` via `--ease-seal-exit` | |

These are screen/JS values, not `@theme` tokens — only `--shimmer-intensity` is the token.

### B2 · `--color-glow-warm-rgb` format → **comma-separated, legacy `rgba()` consumer.**

Deck shipped space-separated `214 162 92`. Pass 3 ships `214, 162, 92` consumed as
`rgba(var(--color-glow-warm-rgb), 0.5)` — and so does token-prep, the prototype JS, and
there is **no** space-separated `rgb(var() / a)` precedent anywhere in `globals.css`.

**Decision:** **`214, 162, 92`** (commas), consumed `rgba(var(--color-glow-warm-rgb), <a>)`.
The deck's space form is the outlier; correct it. Same numbers either way — format only.

### B3 · Cool ramp (Stage 1 vs Stage 3 of the deck) → **Stage 3 greige wins.**

Stage 1 of the deck still shows the pre-greige cool ramp (`#9aa0a8 / #7A8088 / #565b62`);
Stage 3 ships the greige shift (`#a39c8e / #888278 / #635d54`), signed off in review. The
deck owns color and Stage 3 is its final word — Stage 1 is just stale-within-deck.

**Decision:** adopt **Stage 3's** full ramps (below). (Deck doc hygiene: Stage 1 should be
corrected, but that's not a code blocker.)

### B4 · Seal curve tokens → **ship all three from Pass 3.**

The deck's `@theme` block omitted curves entirely; the motion spec mandates they land at
Pass 1 *before* the screen references them (else a silent default-`ease` fallback — the
`--ease-breath` drift trap). Pass 3 carries the resolved set:

| Token | Value | Status |
|---|---|---|
| `--ease-seal-iris` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | **placeholder** = `--ease-essence`; the vault design thread tunes it later (one token, no screen edits). It did **not** deliver a tuned curve in this deck. |
| `--ease-seal-ember` | `cubic-bezier(0.2, 0.0, 0.5, 1)` | real (Pass 2): ember catch + shimmer onset |
| `--ease-seal-exit` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | real (Pass 3): Processing exit ease-down; tune tail toward `(0.4, 0, 0.15, 1)` on oat |

**Naming note (not a blocker):** `--color-vault-bronze` now holds a *greige* value
(`#888278`), and equals `--vault-case-cool-1`. Name kept for carry-forward (renaming = screen
edits for zero gain); comment marks it.

---

## The reconciled `@theme` block (drop-in)

```css
@theme {
  /* ── Anchor tokens ─────────────────────────────────────── */
  --color-vault-bronze: #888278;     /* cool/dormant base · Greige (name historical; value is greige, == --vault-case-cool-1) */
  --color-vault-ember:  #f3d9a4;     /* ignited ember core */
  --color-glow-warm-rgb: 214, 162, 92;  /* shimmer ground · COMMA form · rgba(var(--color-glow-warm-rgb), <a>) */

  /* ── caseMetal · cool vessel case (Greige, unsealed) — linear ↓ */
  --vault-case-cool-0: #a39c8e;      /*   0% */
  --vault-case-cool-1: #888278;      /*  52% */
  --vault-case-cool-2: #635d54;      /* 100% */

  /* ── caseMetalWarm · ignited/sealed case (Reliquary) — linear ↓ */
  --vault-case-warm-0: #b6ab97;      /*   0% */
  --vault-case-warm-1: #8c8174;      /*  52% */
  --vault-case-warm-2: #5f574c;      /* 100% */

  /* ── interior · open vault interior (cool) — radial ◎ */
  --vault-interior-0: #d2c9b9;       /*   0% center */
  --vault-interior-1: #bdb29d;       /*  70% */
  --vault-interior-2: #968b75;       /* 100% edge */

  /* ── emberCool · dormant ember socket — radial ◎ */
  --vault-ember-cool-0: #b8b3a8;     /*   0% */
  --vault-ember-cool-1: #847d70;     /* 100% */

  /* ── emberIgnited · caught ember halo — radial ◎ fades to 0 */
  --vault-ember-halo-0: #fbe6c0;     /*   0% */
  --vault-ember-halo-1: #eecb84;     /*  38% */
  --vault-ember-halo-2: #d9a85a;     /*  70% */
  --vault-ember-halo-3: rgb(217 168 90 / 0);  /* 100% transparent */

  /* ── lit core · solid lit center of sealed boss */
  --vault-lit-core: #f3d9a4;         /* = --color-vault-ember */

  /* ── shimmer ground · single primitive, OPACITY-driven, plain opacity on oat,
        NO screen blend. Fixed gradient geometry; rest/active/exit = intensity ×
        breath, NOT radius (Pass 3 carry-forward contract). Per-state bases live in
        the screen: faint 0.05 · active 0.12 · neutral 0.025 · RM 0.05 · breath sine
        7000ms dip 0.25 · exit 1200ms. */
  --shimmer-intensity: 0;

  /* ── seal curves (land BEFORE the screen references them) */
  --ease-seal-iris:  cubic-bezier(0.4, 0.0, 0.2, 1);  /* placeholder = --ease-essence; vault thread tunes */
  --ease-seal-ember: cubic-bezier(0.2, 0.0, 0.5, 1);  /* ember catch + shimmer onset */
  --ease-seal-exit:  cubic-bezier(0.4, 0.0, 0.2, 1);  /* Processing exit; tune tail toward (0.4,0,0.15,1) on oat */
}
```

**Dropped from the deck (do not paste):** `--shimmer-alpha`, `--shimmer-r-rest`,
`--shimmer-r-active-min`, `--shimmer-r-active-max` — superseded by `--shimmer-intensity` (B1).

---

## Remaining opens (none block the handoff)

1. **`--ease-seal-iris` real value** — still owned by the vault design thread; ships on the
   `--ease-essence` placeholder until tuned. One-token swap when it lands.
2. **`--ease-seal-exit` tail** — Pass 3 flags tuning toward `(0.4, 0, 0.15, 1)` on oat.
3. **On-device intensity re-tune** — all shimmer values read on the prototype ground;
   token-prep's caveat stands: expect ± on the oat surface at 390×844.
4. **Active-breath cadence** — resolved as an intensity-sine multiplier (Pass 3), *not* the
   Stone's `--ease-breath` (lock honored). No further motion sign-off needed.
