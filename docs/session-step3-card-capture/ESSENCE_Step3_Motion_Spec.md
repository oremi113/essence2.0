# ESSENCE Step 3 — Motion Spec (Card Capture + Processing)

**Date:** 2026-06-22 · **Reconciled to Pass 3:** 2026-06-28
**Status:** Spec, not code. This is the final pre-build artifact. The next codeword (pineapple) opens the build.
**Covers:** the seal (hero), the ground shimmer primitive, Processing motion and its exit, reduced-motion resting frames, and the neutral handoff contract between Processing and the Reveal.

> **Pass 3 reconciliation (2026-06-28).** The Processing-exit curve moved off `--ease-page`
> onto a new `--ease-seal-exit` token, and the neutral-exit shimmer value is now **pinned at
> `0.025`** (Pass 3 locks 1 & 2). Shimmer stays a single opacity-driven `--shimmer-intensity`
> primitive — the palette deck's constant-alpha + radius proposal was **not** adopted. The
> authoritative source is `essence-step3-processing-pass3.html`; for the full drop-in `@theme`
> block see `palette-token-reconciliation.md`. **The ~2.5s "Sealed" dwell is kept** (owner call,
> 2026-06-28) — §3 now carries it, matching the build handoff.

---

## §0 Three-layer contract (enforcement checklist)

- Motion lives in layer 3 only (`src/components/screens/`, `src/components/ui/`, `@theme` tokens). No Supabase, no fetch in screen components.
- Token references use `var(--token-name)`. No hex, no raw curve literals in screen components.
- `--shimmer-intensity` is added to the canonical `@theme` block in `src/app/globals.css` before use (the running CSS is canonical; `design-tokens.md` only mirrors it, never the reverse — that inversion is the Step 7 drift trap, Build Handoff §0.4), so it does not diverge screen by screen.
- Every state in both rails is reachable from its `/dev/{name}` sandbox for tuning.

---

## §1 Governing principles

**§SEAL-INTEGRITY (headline).** The ember pour belongs entirely to the Reveal. No motion in this spec pours warmth. The seal's ember is a catch (a pilot-light igniting), not a pour. Processing's exit is tension release (stillness softening), not warmth leaving the vessel. Nothing here pre-spends the Reveal.

**The ember is the constant.** It catches at confirmed commit, holds lit and static through the entire wait, and is still the last thing lit when the Reveal takes over. One element threads the whole ceremonial arc (capture to processing to Reveal). Every timing decision below protects that thread.

**Stillness is the budget for the pour.** Processing is deliberately under-animated (one ambient layer, vault and ember dead-still). The quiet is what makes the Reveal's pour land. Do not spend motion on the vessel during the wait.

**Curve discipline.** The vault uses `var(--ease-seal-iris)` (iris close), `var(--ease-seal-ember)` (ember catch + shimmer onset), and `var(--ease-seal-exit)` (Processing exit). `var(--ease-page)` is **not** used by the vault — the exit moved off it in Pass 3 (see §2). `var(--ease-breath)` is Stone-only and never touches the vault or the shimmer. **Do not retune `--ease-essence` for the close** — it is the universal state-transition curve (~60 references across `globals.css`); a hero-moment tweak there shifts every transition app-wide. The close gets its own token instead (see §2).

---

## §2 Tokens

**Curves**
- `var(--ease-seal-iris)` — iris close. The signature hero curve: confident settle, mechanical certainty of commit, a treasured case closing rather than a machine locking. **Placeholder token** — value is owned by the vault design-architect thread (built elsewhere) and lands at Pass 1 start; until then it falls back to the `--ease-essence` value. Promoted out of `--ease-essence` so the hero close can carry a slower-decel-tail settle without touching the universal curve. *(See DESIGN OPEN 1' below.)*
- `var(--ease-seal-ember)` — ember catch **and** the shimmer onset (the two warm-arrival moments). Bespoke soft-in bloom, `cubic-bezier(0.2, 0, 0.5, 1)`: monotonic, no snap, no overshoot. **Promoted off `--ease-page`** (DESIGN OPEN 1, now resolved — see below). New token; lands in `@theme` (see NOTE FOR CODE ARCHITECT).
- `var(--ease-seal-exit)` — the **Processing exit ease-down** (Pass 3, lock 1). `cubic-bezier(0.4, 0, 0.2, 1)` — a calm symmetric ease-down, **promoted off `--ease-page`** (whose canonical `cubic-bezier(0.22, 1, 0.36, 1)` is a snappy fast-out, wrong for a held-breath release — same lesson that moved the ember off it). New token; lands in `@theme`. Exit duration ~1200ms. Open refinement: tune the tail toward `(0.4, 0, 0.15, 1)` on oat.
- `var(--ease-page)` — canonical screen-entrance curve. **Not used by the vault** (mirrored only). The exit moved off it.
- Shimmer loop is a slow sine, not an ease. It is ambient, not a transition. Period ~7000ms, dip ~0.25 below the state ceiling (active breathes ~0.09→0.12).

**Durations** (use existing ramp; total seal weight is ceremonial)
- Iris close: ~800ms (large/ceremonial range).
- Ember catch: ~400ms, offset 175ms after iris completes.
- Settle: ~300ms.
- Shimmer onset: ~1000ms (0 to faint).
- Hero-line dwell: ~2500ms hold on the "Sealed" line after the settle, before the copy crossfade (see §3).
- Shimmer ramp (faint to active): across the normal wait, ~`--duration-ceremonial` scale, slow.

**New token**
- `--shimmer-intensity` — single primitive, **opacity** is the parameter, over a fixed gradient geometry. Concrete values (Pass 3, validate on oat): `0` (off), `faint = 0.05` (waiting), `active = 0.12` (working ceiling), `neutral = 0.025` (handoff exit, pinned — lock 2), RM static rest `= 0.05`. Effective opacity each frame is `base × breath` on the ground layer only; the object never moves. **No second token, no radius parameter** — the palette deck's constant-alpha + radius proposal was not adopted (Pass 3 carry-forward contract). RM snaps to the static faint rest frame, no loop.

---

## §3 The seal (hero)

Fires only on confirmed payment (3b). Single continuous sequence into Processing. `t=0` at the confirmed-payment seal trigger.

```
t=0–800ms      IRIS CLOSE
               var(--ease-seal-iris). Spokes/iris draw shut. Mechanical certainty.
               Ground still. shimmer 0. emberState: cool.

t≈975ms        EMBER CATCH  (iris-complete + 175ms)
               ~400ms, var(--ease-seal-ember) soft bloom. Pilot-light ignites and holds.
               Reliquary warmth, earned by the close. emberState: cool → ignited.

t≈1375–1675ms  SETTLE
               ~300ms micro-settle to dead-still. Ember holds lit. The lingering image.
               "Sealed. Your voice is on its way." is full and held here.

t≈1675ms+      SHIMMER ONSET  (ground only)
               --shimmer-intensity 0 → faint over ~1000ms. The ground rises
               under the held copy. Does not touch the vault or the text.

DWELL ~2500ms  The "Sealed" line holds ~2.5s after the settle. The commit
               payoff gets a breath. The wait-copy does not step on the peak.

t≈4200ms+      COPY CROSSFADE  (Processing register begins)
               "Sealed. Your voice is on its way." → "Preparing your voice."
               Shimmer continues faint → active, paced to the wait (§4),
               not a fixed duration.
```

**Why sequenced, not simultaneous.** The close visibly causes the catch (commit, then ember earned). Simultaneous blurs that into one flash and reads as machine, not reliquary. The 175ms offset is tight enough that certainty of commit is not lost to hesitation.

**Why the ember is last.** Close, then catch, then dead-still. The lit ember holding is the image carried into the wait, the pilot-light of their voice, now lit.

**Why the dwell.** The "Sealed" line is the emotional peak of the whole flow and this audience needs a beat to absorb it. Letting the wait-copy crossfade in under two seconds steps on the payoff. The shimmer can rise during the dwell (it is ground-layer and silent), but the words hold. *(Owner call, 2026-06-28: dwell kept — resolving the §3-vs-build-handoff conflict in favour of the held beat.)*

**Ground during the seal.** Still. Shimmer stays at 0 through the entire hero motion so it never competes with it. The shimmer is the signal that the wait/work has begun, so it ignites only after the settle (it may rise during the dwell, since it is ground-layer and silent).

---

## §4 Shimmer — token and activation map

One primitive, spec'd globally, activated only in the ceremonial/waiting register. The intensity gradient is the meaning: faint = waiting, active = working. That makes it a signal, not decoration.

| State | `--shimmer-intensity` | Reasoning |
|---|---|---|
| Beat 1 (recognition, sample, loss-frame) | `0` | Reading and deciding. Ambient motion under text fights readability and the calm register. This audience feels it. |
| Beat 2 (value, price, CTA) | `0` | Never run shimmer under the price. |
| confirm-hold (3a) | `0` | Pre-seal wait. Shimmer must not imply progress before payment is confirmed. |
| confirm-timeout (3c) | `0` | Calm hold stays calm. No false sense of work. |
| Seal settle (3b rest) | `0 → faint` | Shimmer ignites here. From this point it always means "confirmed and working." |
| processing-normal | `faint → climbing` | The wait has begun. |
| processing-extended | `active` | Work continuing (or silent retry; the user cannot tell, by design). |
| processing-notify-handoff | `active` | Still working in the background. |
| post-seal-support | `faint (low calm)` | Held, not abandoned. Work paused awaiting human, so intensity drops but never to 0. |
| Processing exit (gen complete) | `active → neutral (0.025)` | Released calm. The held breath releasing, eased over ~1200ms via `--ease-seal-exit`. See §5. |
| Reveal | (its own ambient) | Owns its layer from neutral. Separate spec. |

**Guardrails**
- Ground layer only, distinct from the vault object. The shimmer never animates the vessel.
- The token is shared with the wider system, so the Memory Shelf must not read shimmer as its "glow = unplayed" semantic. Different layer, different meaning. Keep them separate at the component level.
- Reduced motion snaps the shimmer to a static mid-rest frame, never the trough, never a loop.

---

## §5 Processing motion and exit

**During the wait.** Vault dead-still, sealed, ember static-ignited. The only motion is the ground shimmer at the intensity for the current state (§4). Copy progresses on timers: normal → extended → notify-handoff. No vault motion at any point.

**Exit on completion (gen ready).** The shimmer eases from `active` (0.12) down to `neutral` (0.025) over ~1200ms using `var(--ease-seal-exit)`. Stillness softens. This is the held breath releasing. It lands on the neutral contract frame (§7) and stops there.

**Critical, §SEAL-INTEGRITY.** Processing's exit does not pour warmth. It is tension release (shimmer settling, luminance neutralizing), not warmth pouring out of the vessel. The pour is the Reveal's, entirely. If Processing's exit pours, the Reveal underdelivers.

**No re-pay control anywhere in Processing.** Payment is confirmed before entry, so §RETRY-BY-KNOWLEDGE has nothing to do here. The only retry is the silent server-side gen retry, invisible and safe.

---

## §6 Reduced motion

Single source of truth: the `useReducedMotion` hook. Pin to peak/mid resting values, never the animation trough. Ember static in all paths.

| Motion | Reduced-motion behavior |
|---|---|
| Seal | No iris animation, no ember bloom. Render the sealed resting frame directly: iris closed, ember lit (static), at peak/mid. Copy shows "Sealed. Your voice is on its way." instantly (no crossfade), then the same ~2.5s dwell timing holds before the Processing copy swaps in (the dwell is copy-pacing, not motion, so RM keeps the beat). |
| Shimmer | Static faint rest frame. No loop, no onset animation. |
| Processing | Already still. Shimmer at static rest. |
| Processing exit | No animated ease-down. The neutral contract frame is rendered directly. |
| Reveal handoff | Reveal builds from neutral under its own RM rules. |

---

## §7 The neutral handoff contract (Processing ↔ Reveal)

This is the explicit boundary between this spec and the Reveal spec. It exists because the Reveal must be entrance-independent: a notify deep-link can land a cold session in the Reveal with no Processing animation in memory.

**The neutral contract frame:**
- Vault sealed, ember lit and static.
- Shimmer at neutral/low rest (`--shimmer-intensity = 0.025`, pinned — Pass 3 lock 2).
- Ground calm, no warmth poured.

**Rules:**
- Processing owns a self-contained exit *to* this frame and stops. It never animates into the pour.
- The Reveal owns the pour, built to rise *from* this frame whether or not Processing's exit just played.
- When the user is present: release → build → pour reads continuous.
- When cold (deep-link): the Reveal builds from neutral. Still clean.
- Warmth lives only on the Reveal side of this boundary.

---

## §8 Verification bar

Playwright across both rails (CardCapture and Processing), at 390×844, 4× CPU throttle, 60fps target, zero console errors. Specifically:

- The seal sequence holds 60fps under throttle. The iris close is the heaviest moment, verify no drop.
- The shimmer loop does not drop frames at `active` intensity.
- The RM path renders every resting frame with zero animation and the ember static.
- A cold-start deep-link into Processing renders the correct state via re-fetch (no blank, no paywall).
- A cold-start deep-link into the Reveal builds from the neutral contract frame with no dependency on Processing's exit.

---

## DESIGN OPEN

1. **Ember catch curve. — RESOLVED (Pass 2).** Originally proposed `var(--ease-page)` to avoid token drift. On inspection, canonical `--ease-page` is `cubic-bezier(0.22, 1, 0.36, 1)` — a snappy fast-out (it reaches full almost immediately; *not* the gentle decel first assumed, and not an overshoot — peak y is exactly 1.0). A fast-out reads as a hard "on" against the rig, which §EMBER-TIMING forbids. So the trip-wire fired on curve evidence: promoted to a bespoke **`--ease-seal-ember` = `cubic-bezier(0.2, 0, 0.5, 1)`** (soft-in, monotonic, no overshoot). The shimmer onset shares the same warm-arrival curve. Nothing in Pass 2 references `--ease-page`, so the page-curve drift cannot reach the warm moments.

   **1'. Iris close curve (same pattern, one layer up).** The close was on the shared `--ease-essence` — the universal state-transition curve (~60 refs in `globals.css`), so retuning it in place is out of bounds. Promoted to its own `--ease-seal-iris` token instead. The *value* is owned by the vault design-architect thread (rig built elsewhere); on the build side it ships as a **placeholder = the `--ease-essence` value** until that thread lands the tuned curve. Expected direction: a slower-decel tail for a more confident settle ("treasured case closing with certainty," §3). When the real value lands, surface it as an explicit fork, not a silent swap.
2. **Seal total duration.** Proposed ~1.68s to dead-still (800 iris + 175 offset + 400 ember + 300 settle). This is the taste dial on the hero moment. Slower reads more reverent, faster reads more certain. Recommendation: hold at ~1.68s, tune by feel in Pass 2.
3. **Processing exit curve. — RESOLVED (Pass 3, lock 1).** The exit was provisionally on `--ease-page`, whose canonical `cubic-bezier(0.22, 1, 0.36, 1)` is a snappy fast-out — wrong for a held-breath release. Promoted to a bespoke **`--ease-seal-exit` = `cubic-bezier(0.4, 0, 0.2, 1)`** (calm symmetric ease-down), mirrored in the Pass 3 prototype's JS sampler so token and rAF match. Remaining: tune the tail toward `(0.4, 0, 0.15, 1)` on oat.
4. **Neutral-exit shimmer value. — RESOLVED (Pass 3, lock 2).** Pinned at `0.025` — distinct from the RM faint rest (`0.05`), as §6/token-prep required.

---

## NOTE FOR CODE ARCHITECT

- `--shimmer-intensity` must be added to the canonical `@theme` block in `src/app/globals.css` first (not `design-tokens.md` — that doc only mirrors the running CSS; Build Handoff §0.4). Do not introduce it per-screen.
- `--ease-seal-iris` is a **new placeholder token** for the iris close. Add it to the `@theme` block at Pass 1 start with the `--ease-essence` value as its placeholder (`cubic-bezier(0.4, 0.0, 0.2, 1)`), referenced as `var(--ease-seal-iris)` in the screen. The real curve comes from the vault design thread and replaces only this token's value — never `--ease-essence` itself. Do not inline a raw bezier in the screen.
- `--ease-seal-ember` is a **new real token** (not a placeholder): `cubic-bezier(0.2, 0, 0.5, 1)`, the ember catch + shimmer onset curve (DESIGN OPEN 1 resolved). **It must land in the `@theme` block before Pass 2 references it** — if the screen uses `var(--ease-seal-ember)` while the token is absent from `@theme`, the transition silently falls back to the default `ease` keyword (a different curve). This is the same drift trap as `--ease-breath`; do not repeat it. Mirror it into `design-tokens.md` only *after* it is in `globals.css`, never before.
- `--ease-seal-exit` is a **new real token** (Pass 3, DESIGN OPEN 3 resolved): `cubic-bezier(0.4, 0, 0.2, 1)`, the Processing exit ease-down. Same landing rule — in `@theme` before the screen references it, or it silently falls back to default `ease`. The Pass 3 prototype samples this same curve in JS for the rAF exit; token is the source of truth, the JS sampler is its shadow — if the value changes, change both.
- The reconciled, drop-in `@theme` block for the whole vault (colors + shimmer + all three seal curves) lives in `palette-token-reconciliation.md`. Paste from there at Pass 1, not from the palette deck (whose shimmer tokens are superseded).
- Shimmer is a ground-layer element, never a property of the vault object. Keep them separate in the DOM so the object stays still while the ground moves.
- The seal is one timeline, not four independent transitions. Sequence it as a single choreography so the 175ms offset and the settle stay locked relative to each other.
- The neutral contract frame (§7) is a real, nameable state the Reveal depends on. Build it as an explicit boundary, not an implicit end-of-animation position.
- No `var(--ease-breath)` on the vault or the shimmer. Stone-only.
- No `brightness()` filter anywhere. Locked rule.
- No em dashes in any copy strings.
