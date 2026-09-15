# Manual Test Plan — M4 Integration Spine (owner self-walk)

**Date:** 2026-07-12
**Purpose:** Your own eyes-on pass of the landed monetization spine (record → pay →
voice → reveal → first breath → first message). The M4 spine is on `main` and is
**not** changed by the privacy branch's happy path — walk it on any branch.

**Scope boundaries (avoid double-work):**
- **Privacy-promise modal / Screen4 / consent gate / voice-delete** → owned by the
  privacy agent + covered by the qa-scout Pass B sweep. **Don't re-audit here.**
- **All 28 `/dev/*` isolation screens** → covered by qa-scout Pass A. This plan is
  the *authed journey* only — the connected flow a real user walks.
- This is a **feel + correctness** pass. qa-scout catches pixel/motion drift
  automatically; you're here to judge whether the *sequence* feels right and nothing
  strands you.

---

## Two ways to walk it

| Walk | Flags | Stripe | What it proves | When |
|---|---|---|---|---|
| **A — Mock walk** | OFF (default) | none — `?mock=true` = paid | the whole route sequence + every screen renders + no dead ends | **now, zero setup** |
| **B — Vendor walk** | ON | Stripe **test** mode (`4242…`) | real Checkout + real ElevenLabs + DB rows | needs `.env.local` keys — see `docs/session-s5-golive/brief.md` Track B/C |

Do **Walk A first** — it needs nothing but a dev login and proves the spine is whole.
Walk B is the pre-cutover confidence pass (already scripted in the S5 brief; don't
duplicate — this doc is the journey checklist, that doc is the Stripe setup).

---

## Setup (Walk A — mock)

1. Dev server running (default `http://localhost:3000` — use whatever port yours is on).
2. Log in without a magic link: `node scripts/dev-login.mjs`
3. Confirm flags are **OFF** (they are by default): `VAULT_STRIPE_ENABLED` and
   `VOICE_CREATION_REQUIRES_PAYMENT` unset. This keeps `?mock=true` = paid and
   nothing charges.
4. **Turn on 4× CPU throttle** for the motion beats (DevTools → Performance →
   CPU 4× slowdown, or `scripts/throttle-dev.mjs`), and set the viewport to
   **390×844** (iPhone 12/13/14). This is the shippability bar per CLAUDE.md.

---

## The walk — beat by beat

Each beat lists the **route**, what you should **see**, and the **pass bar**. Check
the box only if it both works *and feels right* at 4×.

### 1 — Record the reference clip
- **Route:** `/app/record` (→ `/app/voice/create`)
- **See:** RecordScreen; record a short voice clip; reach the post-record continue state.
- **Pass:** [ ] recording captures and plays back; continue is enabled.
- **Watch:** the exit now goes to **Card Capture**, *not* `/messages/new`. If you land
  on message creation, the spine reorder regressed.

### 2 — Card Capture (the single pay moment)
- **Route:** `/app/vault/protect`
- **See:** `CardCapture` — plan toggle (monthly / annual), play-sample of your clip,
  one primary "keep" CTA, a low-commitment "not now".
- **Pass:**
  - [ ] Plan toggle switches monthly↔annual (price updates).
  - [ ] Play-sample plays *your* recorded clip.
  - [ ] "Not now" parks you honestly (journey pauses, nothing processed, **no free
        tier implied**) and you can re-enter.
  - [ ] Primary CTA is the *only* checkout button (no leftover two-CTA arc).
- **Copy check:** loss/urgency framing belongs *here* at the pay moment — but must not
  imply a free tier. (Ref: copy-voice guide, "money voice".)

### 3 — Checkout → Processing
- **Route after CTA:** `/app/voice/processing?mock=true` (Walk A) — the mock URL stands
  in for Stripe's `success_url`.
- **See:** `Processing` — the wait surface (procedural, "email me when ready" /
  "taking longer" tails as time elapses).
- **Pass:**
  - [ ] **No bounce back to Card Capture** (the #84 race guard — critical).
  - [ ] Processing triggers voice creation and polls to `ready`.
  - [ ] On `ready` → advances to Reveal on its own.

### 4 — Vault Reveal (the payoff)
- **Route:** `/app/vault/reveal`
- **See:** the bronze `BronzeVault` reveal (migrated off the old gray seal in #96) —
  composites on gold, no box/corner artifacts.
- **Pass:**
  - [ ] Reveal renders on the bronze engine, 0 console errors.
  - [ ] **Motion at 4×:** the reveal settles cleanly, no jank/stutter. This is the
        one beat where I flagged the throttle pass wasn't re-run post-#96 — **judge it here.**
  - [ ] Advance → First Breath.

### 5 — First Breath (first playback ceremony)
- **Route:** `/app/record/complete`
- **See:** `FirstBreathSequence` with the procedural Web Audio engine (#91).
- **Pass:**
  - [ ] **Audio actually plays** and matches the ceremony's cadence (this is the
        owner ear-review that headless can't do — *your* call).
  - [ ] If audio fails, it **degrades to silence** and the ceremony still completes
        (S10-C, `974c5d4`) — never a broken/frozen sequence.
  - [ ] Exit ("See My Stone" → Continue) → `/messages/new` (**not** the old
        "coming soon" stub).

### 6 — First Message (onward)
- **Route:** `/messages/new`
- **See:** message creation (A2→A6→A4→A7), 3-message lifetime cap → C3 Vault Limit.
- **Pass:**
  - [ ] First message creation flow works.
  - [ ] After 3 saved messages, the **Vault Limit (C3)** screen gates further saves
        (server-enforced, `vault_limit_reached`).

---

## First-run-only guard (don't skip — easy to miss)
A `trial|active` user whose voice is already `ready` should **skip the whole spine**
and land on Home B — never re-enter Card Capture / Processing / First Breath.
- [ ] After completing the walk once, hitting `/app/record` / `/app/vault/protect` /
      `/app/voice/processing` as the same (now-paid, voice-ready) user routes **forward**
      to Home B, not back into the activation spine. (Spec §6.4.)

---

## What "pass" means
- **Green:** every box checked, no dead ends, motion clean at 4×/390, First Breath
  audio feels right, no console errors.
- **Anything red →** note the beat + what you saw. Real findings (yours or qa-scout's)
  get handed to **bug-fixer** with the repro. I can triage the qa-scout report against
  this walk when it lands and route the real ones — ping me.

## Not covered here (by design)
- Restore / lapsed / past-due flows (shipped + hardened separately).
- The privacy-disclosure surfaces (other agent + qa-scout Pass B).
- Real Stripe / prod cutover — that's Walk B + S5 Track D (`docs/session-s5-golive/`).
