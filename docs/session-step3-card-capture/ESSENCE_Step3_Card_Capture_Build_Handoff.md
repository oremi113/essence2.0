# ESSENCE Step 3 — Card Capture + Processing, Build Handoff

**Date:** 2026-06-23
**Status:** Design closed. This opens the build. Pineapple gates Pass 1. Build runs in three passes: Pass 1 static structure, Pass 2 the seal alone, Pass 3 ambient shimmer and the neutral handoff. The old two-pass cut bundled the seal with the shimmer primitive, reduced-motion, and the handoff contract in one pass. Those are four things, and the two hardest competed for the same tuning attention, so the choreography is now split. See §9.
**Companion file:** `ESSENCE_Step3_Motion_Spec.md` (the seal, shimmer, Processing motion, reduced-motion, the neutral handoff contract). This doc is the build plan and state inventory. The motion spec is the timing. Feed both to Terminal.

---

## §0 Three-layer architecture contract (enforcement checklist, read first)

1. **Backend** (Supabase, `/api/*`, middleware, URLs) is untouched. No URL renames.
2. **Page files** stay thin: fetch, pass to the screen component via props. No logic.
3. **UI** is the only layer this build touches. Screen components live in `src/components/screens/`, never import Supabase, never call fetch. Tokens only, `var(--token-name)`, no hex in screen components.
4. **Canonical token source is `src/app/globals.css` `@theme`** (the running CSS). `docs/design-tokens.md` mirrors it as documentation, never the reverse. Any new token lands in `@theme` first. This is the Step 7 drift trap, do not repeat it. **`--shimmer-intensity` lands in `@theme` in Pass 1 at value `0`**, even though nothing animates it until Pass 3. The token has to exist in the canonical block from the start or the drift trap reopens. It sits at `0` until Pass 3 gives it a loop.
5. Each screen gets a `/dev/{name}` sandbox at `src/app/dev/{name}/` (never `src/app/app/dev/`), fed mock data, reachable for every rail state below.
6. No new packages. Localhost 3100. No em dashes in any copy string. No `brightness()` filter. `var(--ease-breath)` is Stone-only and never touches the vault or shimmer.

---

## §1 What closed, what opens

This thread closed the full state inventory and the motion spec for the card-capture re-architecture. Spine, strategy, and copy were already locked coming in. Now closed: the component seam, the prop shape, both rails with mock data, the two hard failure paths, and the motion timing.

What opens now: Pass 1 (static structure), Pass 2 (the seal alone), Pass 3 (ambient shimmer and the neutral handoff), then Playwright across both rails. The split rationale and per-pass gates are in §9. One prerequisite sits in front of the build, see §8.

---

## §2 Locked decisions (§, non-negotiable)

**§SPINE.** Two beats, one Vault object. Beat 1 = stakes (recognition → sample → loss-frame turn). Beat 2 = commit (value, anchored price, safety, one CTA + risk-reversal microcopy). The seal is the only commit feedback. Empty-vault tense throughout: name what is secured, never the contents, future tense for the voice. The Reveal (later, separate screen) is the first time the voice is real.

**§SEAL-INTEGRITY (the headline, enshrine at the top of the state-inventory section).** Before payment, never fake a seal. After the seal, never un-seal and never spend the pour. Every failure on this screen degrades to calm wait plus notify backstop, never error plus dead end. For a 45 to 70 audience at a money-and-grief-adjacent commitment, that is not gold-plating. A cold failure here is catastrophic to trust, and there is no cheaper version that is acceptable.

**§RETRY-BY-KNOWLEDGE (the guardrail that prevents double-charges).** The retry control is state-dependent. Re-pay only when we know no charge occurred.
- `checkout-error` = definite decline = no charge made. "Try again" re-attempts payment. Safe and correct.
- `confirm-timeout` = unknown = possibly already charged. A re-pay control is the double-charge trap and must not exist. Only "Check again" (re-poll status, never re-charge) is allowed.
These two states look like siblings on the rail. An implementer scanning them will copy the "Try again" button into the timeout state unless this rule is loud. It is a named guardrail, not a footnote.

**§SEAM.** The seal is the component boundary. Two thin screens, see §3.

**§EMBER-TIMING.** The ember ignites only at the seal (3b, confirmed payment), not at confirm-hold. It tracks confirmed money with the same discipline as the seal. The ignited ember is static (a held glow, no pulse), which keeps reduced-motion scoped to the seal alone.

---

## §3 Component boundary and prop shape

**§SEAM splits the flow at the seal into two thin components.**

- **CardCapture** owns Beat 1, Beat 2, confirm-hold (3a), confirm-timeout (3c), checkout-error, the not-now park, and the seal (3b) as its hero exit through the sealed-confirmation rest. Every CardCapture failure is pre-seal and routes to park or notify without a seal. §RETRY-BY-KNOWLEDGE lives entirely here.
- **Processing** owns the Frame 4 wait, the silent server-side retry loop, the generation-failure degradation, and the exit to the neutral handoff frame. Every Processing failure is post-seal: seal holds, ember stays ignited, route to notify.

**CardCapture is single-entry, forward-only.** A late-resolving timeout that seals server-side after the client gave up does not re-enter CardCapture. Notify deep-links always land in Processing (or the Reveal if gen finished), never back in the paywall.

**Prop shape (pure components, fed per `/dev/{name}`):**

```
pricing:    { plan, annualPrice, monthlyPrice, monthlyEquivalent, trialDays }
sample:     { status: 'idle'|'played'|'skipped', clipUrl, label }
vault:      { phase: 'establish'|'confirm-hold'|'sealed',
              emberPresent: true, emberState: 'cool'|'ignited' }   // ignited = static
checkout:   { status, errorKind? }
generation: { status: 'idle'|'processing'|'failed'|'unrecoverable', elapsedMs, budgetMs }
notify:     { armed: boolean, channel: 'email' }
park:       { active, recordingId }
a11y:       { reducedMotion }
proof:      null                                                   // zero-height
component:  'CardCapture' | 'Processing'                           // seam tag, not runtime
```

---

## §4 State inventory

### CardCapture rail

Constant unless noted: `emberPresent:true`. Pricing mock: annual `$119`, monthlyEquivalent `~$10`, monthly `$12.99`, `trialDays:7`, `proof:null`.

| Rail state | vault.phase | ember | Mock deltas |
|---|---|---|---|
| `sample-skipped` | establish | cool | landing view, `sample.status:'idle'`, no after-copy |
| `sample-played` | establish | cool | `sample.status:'played'`, after-copy shown, `clipUrl:'/mock/generic-elder.mp3'` |
| `loss-frame-isolated` | establish | cool | the turn, tuned alone |
| `default-annual` | establish | cool | `pricing.plan:'annual'` |
| `monthly-selected` | establish | cool | `pricing.plan:'monthly'`, price line swaps to `$12.99` |
| `checkout-submitting` | establish | cool | `checkout.status:'submitting'`, button busy, submit locked |
| `confirm-pending` | confirm-hold | cool | `checkout.status:'confirm-pending'`, unsealed, listening |
| `confirm-timeout` | confirm-hold | cool | `checkout.status:'timeout'`, no re-pay control, "Check again" only, `notify.armed:false` |
| `checkout-error` | establish | cool | `checkout.status:'error'`, `errorKind:'declined'`, "Try again" allowed, never sealed |
| `post-commit-confirmation` | sealed | ignited | `checkout.status:'confirmed'`, "Sealed. Your voice is on its way." |
| `not-now-parked` | establish | cool | `park.active:true`, `recordingId:'rec_mock'`, notify hook present |
| `reduced-motion` | sealed | ignited | seal RM final settled frame (see motion spec §6), ember static |

### Processing rail

Constant: `vault.phase:'sealed'`, `emberPresent:true`, `emberState:'ignited'` (static). Single entry, forward-only, no re-pay control ever.

| Rail state | generation | entry | ambient | What you tune |
|---|---|---|---|---|
| `processing-normal` | `processing`, `elapsedMs:8000`, `budgetMs:120000` | seal | shimmer active | 0 to 60s wait. "Preparing your voice." |
| `processing-extended` | `processing`, `elapsedMs:75000` | seal | shimmer active | 60 to 120s softening. Absorbs slow-gen AND silent retry. |
| `processing-notify-handoff` | `failed` (internal), `elapsedMs:120000` | seal | shimmer active | Budget elapsed. Keep-open-or-notify offer. `notify.armed` flips on tap. |
| `notify-landing` | `processing`, re-fetched | notify-deeplink | shimmer active | Cold start from email. Restores context, never blank or paywall. |
| `post-seal-support` | `unrecoverable` | seal | shimmer faint (low calm) | True-failure tail. Seal holds, SLA promise, notify armed. |
| `reduced-motion` | `processing` | seal | shimmer static rest | Processing RM resting frame. |

**Generation failure is invisible to the user, by design.** After a gen failure the server retries quietly inside the budget. `processing-extended` is what the user sees whether the gen is merely slow or silently retrying. There is no visible "failure" surface during Processing. The UI degrades by elapsed time, not by error state. `generation.status:'failed'` is internal bookkeeping that drives the retry loop and the eventual notify handoff. The first time the user could sense trouble is the notify handoff, framed as a convenience, not a fault.

---

## §5 The two resolved failure paths

### confirm-timeout (3c)

Timeout means we do not know payment succeeded, so the seal cannot fire. But timeout is not an error to the user, they paid and are waiting. So:

- Vault stays in the 3a confirm-hold appearance. No new alarmed visual. Modest, unsealed, listening, ember cool. The only change is copy acknowledging the wait.
- Poll a status endpoint with backoff, never a re-charge. Client polls for up to roughly 90s to 2 minutes, then stops the loop and hands to the notify handoff (it does not spin). Server-side reconcile keeps listening on the webhook up to Stripe session expiry (~24h) and fires notify on resolution.
- §RETRY-BY-KNOWLEDGE: no re-pay control. "Check again" re-polls status only.
- Three honest exits: confirmation lands (seal fires late, 3b), user arms notify and leaves (deep-link back to Processing), or the true-negative tail (Stripe session abandoned, no charge) reconciles server-side and routes to the park with an explicit no-charge reassurance. Never a guess.

Copy (covers both branches, kills the re-pay impulse):
> Still confirming your payment. There's no need to pay again. We'll seal your Vault the moment it comes through.

Extended-wait handoff:
> Taking longer than usual. You can keep this open, or we'll email you the moment your Vault is sealed.

### post-seal-generation-failure

The most dangerous failure in the flow, because the seal already fired. Governing rule: after the seal, the seal holds, and the ember pour is never spent on a failure. You do not un-seal, do not show an error frame that contradicts the seal, do not show "Try again" (nothing for the user to fix, and asking them to retry after they paid reads as the product failing them).

- The failure becomes a longer wait, never a break. Seal holds, ember stays ignited.
- Retry is tied to the hold budget (~2 minutes), not a fixed count. Retry until the budget elapses, then hand to notify. This handles a flapping vendor (the Step 6 502 pattern).
- When gen completes late (via retry or notify deep-link), the user lands in the real Reveal with the full ember pour. The failure delayed the first-listen, it did not consume it.
- True-failure tail (`unrecoverable`, e.g. corrupted reference) routes to `post-seal-support`, not a dead end.

Copy (empty-vault tense, no blame):
> Your Vault is sealed and your voice is safe.
> It's taking a little longer to prepare than usual. We'll have it ready soon.

Notify handoff:
> You can keep this open, or we'll let you know the moment your voice is ready to hear.

Support tail (SLA-bound, number is placeholder until ops reality is set, hold at one day):
> Your Vault is sealed and your voice is safe. We're making sure it gets created, and we'll reach out within a day.

---

## §6 Copy to reconcile

These lines were drafted or finalized in this thread and must flow back into `ESSENCE_Copy_Voice_Guide.md` and the build doc so copy is not silently decided in specs. **Reconcile these into the copy guide before Pass 1 starts**, so the strings Pass 1 renders are canonical, not spec-draft:

- "Preparing your voice." (Frame 4 happy-path, was open).
- The "Sealed" line dwell timing (~2.5s, a copy-pacing decision).
- The confirm-timeout pair and its notify handoff.
- The post-seal-failure pair, its notify handoff, and the support-tail SLA line.

Apply alongside the 10 resolved edits already queued in `ESSENCE_Copy_Guide_Update_Handoff.md`.

---

## §7 Motion (see companion spec)

Full timing in `ESSENCE_Step3_Motion_Spec.md`. Summary for orientation:

- Seal is one continuous timeline: iris close (~800ms, `var(--ease-seal-iris)` — placeholder token, value owned by the vault design thread; see Motion Spec §2), ember catch (~400ms, +175ms offset, `var(--ease-page)`), settle (~300ms to dead-still), then a ~2.5s dwell on the "Sealed" line before the copy crossfades to "Preparing your voice." Shimmer ignites faint at the settle, under the held copy.
- Shimmer is one global primitive (`--shimmer-intensity`, ground layer), off through every decision and pre-seal state, active only from the seal settle through Processing. Concrete peak-opacity values are in the spec.
- Processing owns a self-contained exit to a neutral calm and stops. The Reveal owns the pour from that neutral frame, cold-start safe.

**Resolved DESIGN OPENs (Pass 2 tuning latitude, not open questions):**
1. Ember catch curve: use `var(--ease-page)`. Add a bespoke `--ease-seal-ember` only if Pass 2 reads too mechanical.
2. Seal total duration: hold at ~1.68s to dead-still. Tune by feel in Pass 2.

---

## §8 Prerequisite before the build

**Notify infra is now load-bearing and sequences ahead of the Frame 4 build, not parallel-optional.** Three resolved routes hand into it (park, confirm-timeout, post-seal-failure). Constraints:
- Transactional-email infra, deliverability-grade, not the marketing channel.
- Deep-links are cold-start safe: re-fetch state on landing, same independence rule as the Reveal entrance. `notify-landing` is the state that proves this.
- The support-tail SLA needs a real number before its copy is final. Hold at one day. Do not promise faster than you can staff.

Log a `docs/FOLLOW_UPS.md` entry for this and for the trial-ending reminder before the day-8 charge (ethical and chargeback protection for the 45 to 70 audience). The consented older-voice sample is a separate placeholder dependency: the build runs on `/mock/generic-elder.mp3` until the real clip exists.

---

## §9 Build sequence

1. **Pineapple gates this.** No code before the codeword. Reconcile the §6 copy lines into the copy guide first (before Pass 1) so the rendered strings are canonical.

2. **Pass 1, static structure.** Both components, all 18 rail states rendered static from mock data, the §3 prop shape wired, tokens resolving to `@theme`, every `/dev/{name}` sandbox reachable. No motion. Three things that are easy to mis-defer to motion but are Pass 1 structural work:
   - **`--shimmer-intensity` lands in `@theme` at `0`** (per §0). The token exists from the start, sits at `0`, animates in Pass 3.
   - **§RETRY-BY-KNOWLEDGE is half structural.** "No re-pay in timeout" is a question of which controls exist per state, which is Pass 1, not Pass 2. `confirm-timeout` must not render a "Try again" button at all, only "Check again." Get it right in the static render and the guardrail is half-enforced before any motion exists.
   - **§SEAL-INTEGRITY is half structural.** The sealed frame and ignited ember must not exist in any pre-seal state's static render. Pass 1 enforces that confirm-hold, timeout, and error render unsealed with a cool ember. Pass 2 enforces the motion side (seal never fires early). Both halves, or the guardrail leaks.

   Two Pass 1 readiness items to confirm at pineapple:
   - The notify-dependent states (`notify-landing`, `processing-notify-handoff`, `post-seal-support`) build as static mock shells now, fed mock data. Their real cold-start verification waits on the §8 notify infra, which gates a Pass 3 verification, not Pass 1. The infra is layer 1/2 and sits outside the pass count; this build is layer 3. Confirm we build the shells now.
   - `proof: null` renders as a present, zero-height slot, not an absent element, so layout does not shift when it is populated later.

   **Gate:** every state renders, every sandbox reachable, zero console errors, no raw hex in screen components.

3. **Pass 2, the seal alone.** The hero timeline only: iris close, ember catch at +175ms, settle to dead-still, the 2.5s dwell, the copy crossfade. Plus the reduced-motion settled-frame variant of the seal, and the hard assertion that the seal renders only at `confirmed`. This is the emotional peak of the whole product and the single heaviest motion moment, so it earns its own pass.
   **Gate:** seal holds 60fps under 4× throttle, never fires in any pre-seal state, RM renders the settled frame with zero animation, dwell timing holds.

4. **Pass 3, the ambient and the handoff.** The `--shimmer-intensity` primitive and its full activation map across all states, Processing stillness and the exit ease-down to neutral, RM shimmer rest, and the neutral handoff contract frame the Reveal depends on. Then the full Playwright sweep across both rails at 390×844, 4× CPU throttle, 60fps target, zero console errors. Assert specifically:
   - Seal holds 60fps under throttle (iris close is the heaviest moment).
   - Shimmer loop does not drop frames at active intensity.
   - RM path renders every resting frame with zero animation, ember static.
   - Cold-start deep-link into Processing renders correct state via re-fetch.
   - Cold-start deep-link into Reveal builds from the neutral contract frame, which is a real nameable boundary, not an end-of-animation accident.
   - **The seal renders only at `checkout.status:'confirmed'`. No seal in confirm-hold, timeout, or error.** Hard assertion in every pre-seal state. This is the motion-side enforcement of §SEAL-INTEGRITY.
   **Gate:** shimmer loop holds 60fps at active, cold-start deep-links render the correct state, the neutral frame is a real nameable boundary.

5. **Design-lens critique + decision register** after the build.

**The Pass 2 / Pass 3 seam (the one coupling to watch).** The seal's shimmer onset (t≈1675ms, `0` to faint at the settle) is literally the handoff into the shimmer system, so Pass 2 and Pass 3 touch at that exact beat. The clean cut: Pass 2 owns "shimmer ignites to faint at settle" against the token, Pass 3 owns "shimmer climbs and resolves across the wait." **The token value is the seam.** Pass 2 sets `--shimmer-intensity` to faint and confirms it rises under the held copy. Pass 3 wires the full faint → active → neutral map. As long as the token exists from Pass 1 (it does, at `0`), the seam holds.

**Why this split and not the old two-pass cut.** Pass 1 is not split because static structure is the low-risk, mechanical part. The skeleton standing up does not blur, so splitting it buys nothing and costs a handoff. The choreography is split because the old Pass 2 bundled the seal AND a new global primitive AND reduced-motion AND the handoff contract. That is four things, and the two hardest competed for the same tuning attention. You cannot verify the seal landed while standing up the shimmer loop in the same breath.

---

## §10 Conventions carried forward

- Wireframe and critique first, build at the end. Pineapple is the gate.
- Locked decisions marked § are never re-debated.
- `NOTE FOR CODE ARCHITECT` headers are the design-to-engineering contract.
- Control-arm files are never modified.
- No em dashes, no new packages, port 3100, `--ease-breath` Stone-only, no `brightness()` on the ember.

---

## NOTE FOR TERMINAL (chunking)

Feed in three chunks to avoid context drift. Motion-spec sections are cited as "spec §N", this doc's sections as "§N":
- **Pass 1 chunk:** §0 through §4, plus §6 (reconcile copy first), plus §9 steps 1 and 2. This is everything needed to build static structure from mock data, including the two half-structural guardrails and the `--shimmer-intensity` token at `0`.
- **Pass 2 chunk:** spec §3 (the seal) and the seal row of spec §6 (the RM settled frame), plus this doc's §7, plus §9 step 3. This is the seal alone: iris, ember catch, settle, dwell, copy crossfade, and the seal's reduced-motion settled frame. Pass 2 sets `--shimmer-intensity` to faint at the settle and stops there.
- **Pass 3 chunk:** spec §4 (shimmer), spec §5 (Processing motion and exit), spec §7 (neutral handoff contract), and the shimmer-rest row of spec §6, plus this doc's §5 (the two resolved failure paths) and §9 step 4. This is the ambient activation map, Processing stillness and exit, the shimmer reduced-motion rest, the neutral contract frame, and the full Playwright sweep.
- Note the §6 split: the seal's RM settled frame goes with Pass 2 (it is part of the seal), the shimmer RM rest goes with Pass 3 (it is part of the ambient). Do not ship all of spec §6 to one pass.
- §8 (notify infra prerequisite) is its own work item ahead of the Frame 4 portion of Pass 1. Build the notify-dependent states as static mock shells in Pass 1, but do not run their cold-start verification (a Pass 3 check) until the infra exists.
