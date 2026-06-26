# Step 3 Vault Palette — Design-Architect Brief (FOLLOW_UPS #65)

**For:** the Claude **design** thread that locks the Step 3 vault colors.
**Why this exists:** the vault bronze/ember palette just changed and the full gradient
ramp is a *design* decision, not engineering's to invent. Engineering is building Pass 1
against **provisional** tokens (see `token-prep.md`); this brief is what design needs to
replace those provisionals with the real palette. The deliverable maps **1:1** onto a
`globals.css @theme` swap — no screen edits when it lands.

**Canonical context:** `ESSENCE_Step3_Card_Capture_Build_Handoff.md`,
`ESSENCE_Step3_Motion_Spec.md`, `docs/ESSENCE_Copy_Voice_Guide.md` (all in-repo).

---

## What you're deciding

1. **Cool / dormant vault palette** — the unsealed vessel (establish, confirm-hold, park,
   checkout-error). Reads *modest, dormant, listening*. Ember cool.
2. **Ignited / sealed vault palette** — the sealed vessel with the ember caught
   (post-commit + all of Processing). Reads *pilot-light caught: warm, held, alive — but
   not yet poured*.
3. **The full multi-stop gradient ramps** for both states (the vessel case, the interior,
   the ember), not just the anchor colors.
4. **The shimmer ground** — color + whether the ratified intensities survive on the real
   surface (see Shimmer section).

---

## What the vault object is (so the palette serves it)

- It is the **hero monetized object** of the product — distinct from the Breath Stone, its
  own identity. The vault is what the money secures.
- **Empty-vault tense throughout.** The object names what is *secured*, never the contents.
  The voice is not real until the Reveal (a separate, later screen).
- **The seal is the only commit feedback.** When payment confirms, the iris closes and the
  ember catches. That is the emotional peak of the whole flow.
- **The ignited ember is a *catch*, not a *pour*.** A pilot-light igniting and holding —
  reliquary warmth, earned by the close. **The warmth pour belongs entirely to the Reveal.**
  If the ignited vault already looks like the payoff, the Reveal has nowhere left to go.
  This is the single most important constraint on the ignited palette: warm, yes — but
  *reserved*. Leave headroom above it for the Reveal.
- **The ignited ember is static** — a held glow, no pulse, no animation. The palette has to
  read right frozen.

---

## Hard constraints (locks — do not design around these)

- **No `brightness()` filter anywhere.** Glow is built from color + gradient + opacity, not
  a brightness filter. Locked rule.
- **`--ease-breath` is Stone-only** — it never touches the vault. (Motion concern, but it
  bounds what the vault is allowed to borrow from the Stone.)
- **Production surface is light "oat"** (`--color-bg-warm-phase` ≈ `#F2EDE4`) at **390×844**.
  The vault sits on a *warm light* ground, not a dark one. Palette must read on oat.
- **Shimmer on oat uses plain `opacity` — no `screen` blend.** `screen` only behaves on dark
  ceremonial surfaces. On a light surface a warm overlay can read muddy rather than
  luminous; if the glow mechanism needs rethinking for a light ground, flag it (but within
  the no-`brightness()` lock).
- **Warmth lives only on the Reveal side of the handoff.** Processing's neutral exit frame
  is *tension release*, not warmth leaving the vessel.

---

## Token outputs (hand these back — they map straight to `@theme`)

Anchor tokens engineering will define:

| Token | Meaning |
|---|---|
| `--color-vault-bronze` | cool / dormant ember + case base |
| `--color-vault-ember` | ignited ember core |
| `--color-glow-warm-rgb` | shimmer ground color (RGB triplet, alpha varied by intensity) |

Plus the **gradient ramps** for each of these SVG gradient slots (named from the Pass 1
prototype — give the stop colors + offsets for each):

| Gradient slot | Used for |
|---|---|
| `caseMetal` | cool vessel case (unsealed) |
| `caseMetalWarm` | ignited/sealed vessel case |
| `interior` | open vault interior (cool/unsealed) |
| `emberCool` | dormant ember socket |
| `emberIgnited` | caught ember halo (the radial bloom behind the sealed iris) |
| lit core | the small solid lit center of the sealed boss |

---

## Current provisional values (starting point, from the Pass 1 prototype)

Not canonical — a floor to push off, so you aren't starting from white:

```
caseMetal (cool case):     #9aa0a8 → #7A8088 (52%) → #565b62
caseMetalWarm (sealed):    #a39c90 → #857c70 (52%) → #5f574c
interior (cool):           #cfc7ba → #b6ad9f (70%) → #928876
emberCool:                 #aab0b6 → #7c828a
emberIgnited (halo):       #fbe6c0 → #eecb84 (38%) → #d9a85a (70%) → rgba(217,168,90,0)
sealed lit core:           #f3d9a4 (solid)
shimmer ground:            rgba(214,162,92, .5 → .18 → transparent)
```

---

## Shimmer intensities (validate, don't assume)

Ratified **start** values, to confirm or move on the real oat surface:

- faint `0.05` (seal settle, processing-normal, post-seal-support)
- active `0.12` (processing-extended, notify-handoff, notify-landing)
- RM rest `0.05` (static faint rest)
- neutral-exit: a *separate* Pass 3 value, still open — do not pin.

Because there's no `screen` blend on oat, these numbers — and possibly the glow mechanism —
may need to move. Confirming them on-device is part of this hand-off.

---

## What "good" looks like (acceptance)

- **Cool** reads *modest, dormant, listening* — a vessel waiting, not alarmed, not yet
  anything. It must not hint at warmth.
- **Ignited** reads *pilot-light caught* — warm, held, alive, earned by the close — yet
  clearly **reserved**: there is visibly more warmth available than the vault is showing.
- **The gap between ignited-vault and the Reveal's pour is legible.** If a viewer can't tell
  the sealed vault is *holding back*, the palette has spent the Reveal's payoff early.
