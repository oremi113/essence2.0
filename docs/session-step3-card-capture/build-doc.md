# Step 3 · Card Capture — Build Doc

**Status:** in design → build. Carries the engineering *rationale* for the screen's
states, failure behavior, and component boundary.

**Canonical source (2026-06-23).** The authoritative state inventory and prop shape is
`ESSENCE_Step3_Card_Capture_Build_Handoff.md` (**18 rail states: 12 CardCapture + 6
Processing**); the motion timing is `ESSENCE_Step3_Motion_Spec.md`. Both now live in this
folder. This doc mirrors them and adds the *why*; where they differ, **the handoff wins**.
It supersedes the earlier 12-state cut here, which predated the Processing-rail split.
Also pairs with the design brief (`docs/Step3_Card_Capture_Design_Handoff.md`) and the v2
wireframe (6 frames).

---

## Governing principles (read first — these are load-bearing)

**§SEAL-INTEGRITY.** *Before payment, never fake a seal. After the seal, never
un-seal, never un-ignite the ember, and never spend the "pour."* Every failure on
this screen degrades to **calm wait + notify backstop**, never "error + dead end."
For a 45–70 audience at a money-and-grief-adjacent commitment, a cold failure here
is catastrophic to trust — there is no cheaper version that is acceptable.

Corollary — **confirmed-money signals fire together, never before.** The seal *and*
the ignited ember are both signals of *confirmed payment*. They appear together at
**3b (confirmed)** and never earlier. Confirm-hold (3a) and timeout (3c) show
**neither** — the vessel stays cool; reassurance is the copy's job, not the ember's.
This keeps warmth tracking confirmed money with the same discipline as the seal, and
means a timeout that resolves to *no charge* needs no visual rollback (nothing was
lit to un-light).

**§RETRY-BY-KNOWLEDGE.** *The retry control is state-dependent. Re-pay only when we
know no charge occurred.* The two states below look like siblings on the rail; they
are not. Both cross-reference this rule so the seam is impossible to miss.

| State | What we know | Allowed retry control | Forbidden |
|---|---|---|---|
| **checkout-error** | definite decline → **no charge made** | **"Try again"** re-attempts payment (safe, correct; matches v2 Frame 6) | — |
| **confirm-timeout** | unknown → **possibly already charged** | **"Check again"** (re-poll status, never re-charge) | **Any re-pay control** — this is the double-charge trap and must not exist |

---

## Component boundary — the seam is the seal

One component spanning Beat 1 → generation-failure is too wide for the thin-screen
model (CLAUDE.md). Split into **two thin components**, with the **seal as the seam**
(the spine's own handoff: *vault closes = commit feedback = handoff*).

- **`CardCapture`** owns Beat 1, Beat 2, confirm-hold (3a), confirm-timeout (3c),
  checkout-error, the not-now park, and the **seal (3b)** as its hero exit through
  the sealed-confirmation rest. **Every CardCapture failure is pre-seal** and routes
  to park or notify *without* a seal. **§RETRY-BY-KNOWLEDGE lives entirely here.**
- **`Processing`** owns the Frame 4 wait, the silent-retry loop, and
  post-seal-generation-failure. **Every Processing failure is post-seal**: the seal
  holds, the ember stays ignited, route to notify. (Processing gets its own short
  rail — `processing-normal`, `post-seal-generation-failure`, `notify-landing` —
  spec'd next.)

**CardCapture is single-entry, forward-only**, with two precise edges:
- *Internal* back-nav is fine — checkout-error → "back to Beat 2, selection kept".
- Forward-only governs **external re-entry after the seal**: a late-resolving timeout
  that seals *server-side* after the client gave up does **not** re-enter CardCapture.
  The notify deep-link always lands in **Processing** (or the **Reveal** if gen
  finished), **never** back in the paywall. Backstopped by the existing route guard
  (`protect/page.tsx` redirects `trial`/`active` away from the paywall).
- The one allowed re-entry: a **parked** user who returns later re-enters CardCapture
  from the top (they never subscribed). Distinct from post-seal no-re-entry.

> The dev rail crosses the seam for tuning convenience; each state below is tagged
> with its **owning component** so the build doesn't fuse them.

---

## Shared prop shape (pure component, fed per `/dev/{name}`)

```
pricing        · plan ('annual'|'monthly'), annualPrice, monthlyPrice, monthlyEquivalent, trialDays
sample         · status ('idle'|'played'|'skipped'), clipUrl, label
vault.phase    · 'establish' | 'confirm-hold' | 'sealed'
vault.emberPresent   · true  (the dormant element is always in the vessel)
vault.emberState     · 'cool' | 'ignited'   (ignited ONLY at 3b; static glow, no pulse)
checkout.status      · 'idle'|'submitting'|'confirm-pending'|'timeout'|'confirmed'|'error'
checkout.errorKind   · 'declined' | …  (only when status:'error')
generation     · status ('idle'|'processing'|'failed'|'unrecoverable'), elapsedMs, budgetMs   (Processing-owned; no 'ready' — ready leaves Processing for the Reveal)
notify         · armed (bool), channel ('email')   (load-bearing — see Dependencies)
park           · active (bool), recordingId
a11y.reducedMotion   · bool
proof          · null now — renders at zero height until real (no fabricated proof)
component      · 'CardCapture' | 'Processing'   (seam tag — which component owns the state; not a runtime value)
```

---

## State inventory

**18 rail states: 12 CardCapture + 6 Processing.** The dev rail crosses the seam for
tuning; each state is tagged with its owning component so the build doesn't fuse them.

### CardCapture rail (12)

| Rail state | Owner | What you're tuning | Mock deltas |
|---|---|---|---|
| `sample-skipped` | CardCapture | Beat 1 landing / establish | `sample.status:'idle'`, no after-copy, `vault.phase:'establish'`, `emberState:'cool'` |
| `sample-played` | CardCapture | Beat 1 after listening | `sample.status:'played'`, after-copy shown, `clipUrl:'/mock/generic-elder.mp3'` |
| `loss-frame-isolated` | CardCapture | Beat 1 — the turn, alone | turn copy only, `vault.phase:'establish'`, `emberState:'cool'` |
| `default-annual` | CardCapture | Beat 2, annual preselected | `pricing.plan:'annual'` ($119 / ~$10), `trialDays:7`, `proof:null` |
| `monthly-selected` | CardCapture | Beat 2, monthly chosen | `pricing.plan:'monthly'` → price line swaps to $12.99 |
| `checkout-submitting` | CardCapture | CTA pressed, redirecting | `checkout.status:'submitting'`, button busy, submit locked |
| `confirm-pending` (3a) | CardCapture | Stripe return, confirm-hold | `checkout.status:'confirm-pending'`, `vault.phase:'confirm-hold'`, unsealed, **`emberState:'cool'`** |
| `confirm-timeout` (3c) | CardCapture | calm hold | `checkout.status:'timeout'`, `vault.phase:'confirm-hold'` (no new visual), **`emberState:'cool'`**, `notify.armed:false` |
| `post-commit-confirmation` (3b) | CardCapture | seal fired (confirmed) | `checkout.status:'confirmed'`, `vault.phase:'sealed'`, **`emberState:'ignited'`**, copy "Sealed. Your voice is on its way." |
| `checkout-error` | CardCapture | definite decline | `checkout.status:'error'`, `errorKind:'declined'`, vault stays `establish` (**never sealed**), `emberState:'cool'` |
| `not-now-parked` | CardCapture | park exit | `park.active:true`, `recordingId:'rec_mock'`, notify hook present, `vault.phase:'establish'`, `emberState:'cool'` |
| `reduced-motion` | CardCapture | seal RM resting frame | `a11y.reducedMotion:true`, `vault.phase:'sealed'` at peak/mid rest, `emberState:'ignited'` (static) |

**Reduced-motion scope.** RM is a modifier on every state, but the *only* resting
frame it changes is the **seal**: it pins to the **settled sealed frame**
(peak/mid), **never the mid-compression trough**. This holds because the ignited
ember is a **static** glow (no pulse) and the establish drift returns to the same
resting frame either way — so no other state needs a second RM resting entry.

### Processing rail (6)

Constant across all six: `vault.phase:'sealed'`, `emberState:'ignited'` (static), **single-
entry, forward-only, no re-pay control ever** (payment is confirmed before entry, so
§RETRY-BY-KNOWLEDGE has nothing to do here). Shimmer column is the **Pass 3** resting register
(token ships at `0` in Pass 1; ratified values in `token-prep.md`).

| Rail state | generation | Entry | Shimmer (Pass 3) | What you're tuning |
|---|---|---|---|---|
| `processing-normal` | `processing`, elapsed 8s / budget 120s | seal | faint→climbing | 0–60s wait. "Preparing your voice." |
| `processing-extended` | `processing`, elapsed 75s | seal | active | 60–120s. Absorbs slow-gen AND silent retry. **Copy unchanged from normal** — no visible failure surface (degrade by elapsed time, not error state). |
| `processing-notify-handoff` | `failed` (internal) | seal | active | Budget elapsed. Keep-open-or-notify offer; `notify.armed` flips on tap. |
| `notify-landing` | `processing`, re-fetched | notify deep-link | active | Cold start from email. Restores context — never blank, never paywall. |
| `post-seal-support` | `unrecoverable` | seal | faint (low calm) | True-failure tail. Seal holds, SLA promise, notify armed. |
| `reduced-motion` | `processing` | seal | static faint rest | Processing RM resting frame. |

> **The `post-seal-generation-failure` behavior is not a single visible state.** By design it
> has no failure surface (see hard-path resolution below): the silent retry shows as
> `processing-extended`, the budget-elapsed beat as `processing-notify-handoff`, and only the
> genuinely unrecoverable tail surfaces — as `post-seal-support`.

---

## Hard-path resolutions

### confirm-timeout (3c)
- **Never fake a seal.** Timeout = we don't know payment succeeded → the seal cannot
  fire and the ember stays cool. The vessel stays in the **3a confirm-hold
  appearance** (modest, unsealed); only the copy changes to acknowledge the wait.
- **Poll-with-backoff, never re-charge.** If confirmation lands at any point, the
  seal fires **late** (→ 3b). Late is fine. Fake-early is not.
- **No re-pay control here** (§RETRY-BY-KNOWLEDGE). Actions: keep waiting (passive),
  "Check again" (re-poll, allowed), or arm notify (hand to email).
- **Poll ceiling.** Client polls confirm-hold with backoff for **~90s–2min**, then
  **stops** and transitions to the notify handoff (it does not spin). **Server-side
  reconcile** keeps listening on the webhook up to **Stripe session expiry (~24h)**
  and fires notify on resolution: **sealed** → deep-link into Processing; or
  **definitive no-charge** → park, with the explicit "no charge was made"
  reassurance. Confirm-hold never spins forever.
- **Three honest exits:** (1) confirmation lands → seals late; (2) user arms notify
  and leaves → deep-link back; (3) true-negative tail (session abandoned, no charge)
  → server reconciles → park. Never a guess.

**Copy (calm; never implies failure):**
> Still confirming your payment. There's no need to pay again. We'll seal your Vault
> the moment it comes through.

**Extended-wait → notify handoff:**
> Taking longer than usual. You can keep this open, or we'll email you the moment
> your Vault is sealed.

### post-seal-generation-failure (Processing — most dangerous failure in the flow)
The seal already fired, money is taken, "Sealed. Your voice is on its way." has been
shown — and the ~1-min generation for the Reveal fails.
- **§SEAL-INTEGRITY:** the seal **holds**, the ember **stays ignited**, the **pour is
  reserved for the genuine Reveal**. Do **not** un-seal. Do **not** show an "error"
  frame contradicting the best moment in the flow. The failure becomes a **longer
  wait**, never a break (same as the existing audio-unavailable pattern).
- **Retry = silent, server-side, tied to the hold budget (~2 min)** — not a fixed
  count of one (covers a flapping vendor, e.g. the Step-6 502 pattern). Retry until
  the budget elapses, then hand to notify. **No "Try again"** — there's nothing for
  the user to fix, and asking them to retry after they paid reads as the product
  failing them. (Contrast: pre-payment message-gen *can* offer edit-and-retry.)
- **When gen completes late, the user lands in the real Reveal with the full ember
  pour.** The failure delayed the first-listen; it did not consume it. That is the
  entire reason the pour is reserved.
- **True-failure tail** (reference clip corrupted, gen genuinely cannot complete):
  degrade gracefully into support-grade recovery — seal holds, notify carries the
  SLA line below. Never strand someone with money taken and a terminal error. (More
  ops hook than UI state, but the UI must degrade into it.)

**Copy (empty-vault tense — "being prepared," not "here"):**
> Your Vault is sealed and your voice is safe. It's taking a little longer to prepare
> than usual. We'll have it ready soon.

**Bounded hold → notify handoff:**
> You can keep this open, or we'll let you know the moment your voice is ready to hear.

**True-failure SLA (notify):**
> We'll make sure your voice is created and reach out within a day.

> SLA note: hold the line at **one day**. It's honest and hittable for current
> staffing; a missed SLA on this audience at this moment is worse than a calmer
> promise. The number is a placeholder until ops reality is set — do not promise
> faster than it can actually be staffed.

---

## Dependencies — notify is a prerequisite (with teeth)

Three resolved routes hand into it — **park, confirm-timeout, post-seal-failure** —
so it **sequences ahead of the Frame 4 build, not parallel-and-optional.**
- **Transactional-email infra**, deliverability-grade — *not* the marketing channel.
- **Deep-links cold-start safe**: re-fetch state on landing (same independence rule
  as the Reveal entrance — a deep-link may be a fresh session).
- **SLA needs a real number** (above): one day, copy ceiling, staffable.

→ Tracked as **FOLLOW_UPS #66** (notify infra is a Step 3 build prerequisite; the
trial-ending reminder before the day-8 charge is a coupled item on the same channel).

---

## Open items (not yet locked)
- **Frame 4 happy-path copy** ("Voice now generating…") — still TBD (v2).
- **Frame 6 / checkout-error copy** — TBD; governed by §RETRY-BY-KNOWLEDGE ("Try
  again" allowed here, decline = no charge).
- **3a initial confirm copy** (brief, on first Stripe return, before the timeout
  pair) — short reassurance, TBD.
- **Fidelity-promise watch** (carryover from review): Beat 1's "unmistakably you" is
  a loan the Reveal must repay — keep it to a bar the Reveal reliably clears.
- **Sample provenance:** "An example, from another family" must be truthful +
  consented, or clearly representative.
- **Vault + shimmer tokens to canonize:** `--color-vault-bronze`, `--color-vault-ember`
  (cool→ignited), `--shimmer-intensity` (ships at `0`), `--color-glow-warm-rgb` (shimmer
  ground color). Provisional values + the `@theme` discipline are staged in `token-prep.md`;
  the real bronze/ember palette is owned by a design-architect thread (**FOLLOW_UPS #65**).
  They land in `globals.css @theme` at Pass 1 start (pineapple), **never inline in the
  screen**. The prototype's raw SVG gradient stops are the anti-pattern this replaces.
