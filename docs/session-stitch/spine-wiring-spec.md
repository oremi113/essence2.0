# Spine-Wiring Spec — Card Capture → Processing → Reveal → First Breath

**Date:** 2026-07-10
**Owner:** engineering (this doc) · design source: `essence-step3-card-capture.html`,
`essence-step3-processing-pass3.html`, the built `screens/step3/*` + `FirstBreathSequence`
**Status:** DRAFT for owner review. This is the first and highest-leverage segment
of the full-journey stitch (roadmap M4). It wires the **monetization spine** — the
part of the journey that is fully built as screens but 0% connected.

**Read first:** `docs/session-stitch/integration-map.md` (the graph + verified gaps),
`docs/Step3_Card_Capture_Design_Handoff.md` (the design brief this implements),
MASTER_SPEC §4.2–4.4 (the immutable order), §Step 3/4/5.

---

## 1. What this wires (scope)

**In scope — the spine, in journey order:**

1. Voice reference clip recorded → hand into **Card Capture** (not `/messages/new`)
2. **Card Capture** — the single commit moment (pay, trial starts) → Stripe
3. **Processing** — trigger voice creation *after* payment, wait for `ready`
4. **Vault Reveal** — the relocated payoff (voice now exists)
5. **First Breath** — first playback ceremony (already built + audio)
6. Hand into **First Message** creation (replaces the "coming soon" stub exit)
7. Flip `VOICE_CREATION_REQUIRES_PAYMENT` + `VAULT_STRIPE_ENABLED` on
8. Retire the old 5-screen vault arc (Reveal→Protect→Continuity→Seal→Sealed)

**Out of scope (separate stitch segments):** restore/lapsed flows (shipped, hardened),
Home B hub wiring (already connected), message-creation sub-graph (already wired),
the Step 10 error-copy pass, real Stripe price IDs (owner/ops task at flip time).

**Immutable rules this must honor** (MASTER_SPEC §4.4):
1. Card capture **before** voice processing. 2. Processing completes **before** Reveal.
3. Reveal **before** First Playback. 4. First Playback **before** first message.
5. No Legacy/Guardian during activation. And the DECISIONS lock: **existing URLs
never rename** — we re-sequence which screen renders where and add routes only where
none exists.

---

## 2. The delta — current vs target

| Beat | Route (URL stays) | Renders TODAY | Renders TARGET |
|---|---|---|---|
| Reference clip | `/app/record`, `/app/voice/create` | RecordScreen / VoiceCreationView | same — but **exit changes** (see §3) |
| Card Capture | `/app/vault/protect` *(reused)* | old `VaultProtectScreen` | **`CardCapture`** (`screens/step3`) |
| Processing wait | **`/app/voice/processing`** *(new route — §6.3)* | — | **`Processing`** (`screens/step3`) |
| Vault Reveal | `/app/vault/reveal` | old `VaultRevealScreen` | **old `VaultRevealScreen`, temp-reused** (§6.1) — relocated reveal is a fast-follow |
| First Breath | `/app/record/complete` | `FirstBreathSequence` ✅ | same — but **reachable** + real exit |
| First Message | `/messages/new` | `MessagesNewPageClient` ✅ | same (now the ceremony's exit) |
| *(retired)* | `/app/vault/continuity`, `/app/vault/seal` | old arc screens | **redirect to the new path or 410** |

> URL reuse follows the handoff (§7): "vaultReveal/vaultProtect… all stay; we
> re-sequence which screen the user hits when." Adding `/app/voice/processing` is
> allowed (it's a *new* URL, not a renamed one) if we prefer a semantic route over
> reusing `/app/vault/sealed` — see §6.4.

---

## 3. The load-bearing change: move where `/start` fires + flip the gate

This is the heart of the reorder. Everything else is routing.

**Today (wrong order, free path):**
`VoiceCreationView` calls `POST /api/voice-profiles/[id]/start`
(`VoiceCreationView.tsx:78`) **immediately after recording**, then on `ready`
pushes `/messages/new` (`:258`). The entitlement guard
(`src/lib/voice-creation/entitlement.ts:30`) returns early because
`VOICE_CREATION_REQUIRES_PAYMENT` is OFF — so **voice is created with no payment**,
exactly the free path §Step 3 forbids. The flag is held OFF *because* the user is
`none` at this point today (flipping it now would 402 the live happy path — see
`feature-flags.ts:6-8`).

**Target (card before processing, gate on):**
- `/app/voice/create` (or the record-complete transition) **stops calling `/start`**
  and **stops routing to `/messages/new`**. On reference-clip-complete it routes to
  **Card Capture** (`/app/vault/protect`).
- **`/start` moves to the Processing screen**, called only *after* Stripe returns
  success (status → `trial`). The already-wired entitlement guard now passes
  (trial/active) and creates the voice. No backend change to the guard — just the
  call site moves and the flag flips.
- Flip **`VOICE_CREATION_REQUIRES_PAYMENT=true`** (backend gate now correct) and
  **`VAULT_STRIPE_ENABLED=true`** (surfaces the real commit) *in the same change*
  that lands the reorder — never before, or the happy path 402s.

**Net backend work: near zero.** The gate exists and is wired. This is a call-site
move + two flag flips + routing. That's the good news buried under the roadmap's
"Step 3 ✅ done."

---

## 4. Screen-by-screen wiring

Each beat: entry edge → screen (route) → guards → callbacks to wire → exit edge.
Callback names are the real props from the built components.

### 4.1 Reference clip → Card Capture
- **Entry:** voice reference clip recorded (`VoiceCreationView` reaches its
  post-record state).
- **Change:** the ready/continue handler that currently does
  `router.push(ROUTES.messagesNew)` (`VoiceCreationView.tsx:258`) instead pushes
  **`ROUTES.vaultProtect`** (Card Capture). Do **not** call `/start` here anymore.
- **Guard note:** Card Capture is for `status === 'none'` users (pre-trial). Keep
  the record/voice routes' auth guards as-is.

### 4.2 Card Capture — `/app/vault/protect`
- **Screen:** `CardCapture` (`screens/step3/CardCapture.tsx`), driven by the 12
  states in `mockStates.ts`. `page.tsx` stays thin; a `ProtectActions`-style client
  wrapper owns the callbacks. Mirror the existing `/dev/card-capture` invocation.
- **Guard change (IMPORTANT):** the current `/app/vault/protect` guard bounces
  `trial|active → /app/record` (`protect/page.tsx:15-17`). That must change — Card
  Capture is shown to `none` users; a `trial|active` user has already paid, so send
  them **forward** (to Processing if voice not yet ready, else Reveal/Home), not back
  to record. Re-derive the guard on `getSubscriptionStatus()` + voice status.
- **Callbacks → wiring:**
  - `onSelectPlan(plan)` → set `?plan=` (monthly/annual), reuse `vaultSealWithPlan`
    convention.
  - `onPlaySample()` → play the recorded reference clip (existing playback signing).
  - `onKeep()` → **the single checkout CTA.** Calls the existing
    `POST /api/stripe/create-checkout-session` (via `useCheckout`), `success_url` →
    **Processing** (§4.3), `cancel_url` → back to Card Capture with a cancelled state.
    Collapses the old two-CTA arc (handoff §1) to one.
  - `onNotNow()` → the low-commitment exit — **owner decision §6.2**.
  - `onBack()` → back to voice/record.
  - `onCheckAgain()` / `onResume()` → used by the processing/pending sub-states;
    wire once §4.3 lands.
- **Replaces:** old `VaultProtectScreen`.

### 4.3 Processing — `/app/voice/processing` (new route, §6.3)
- **Screen:** `Processing` (`screens/step3/Processing.tsx`) — already derives its
  wait surface from generation status + elapsed time (`processing | ready | failed |
  unrecoverable`), with the "email me when ready" and "taking longer" tails. Dev
  page: `/dev/processing`.
- **Entry:** Stripe `success_url` lands here (status now `trial`).
- **Action on mount:** **call `POST /api/voice-profiles/[id]/start`** (the trigger
  that moved here). With the gate flipped ON, entitlement passes. Then poll voice
  profile status (reuse `useResource`/existing poll) until `ready`.
- **Exit:** `ready` → **Vault Reveal** (`/app/vault/reveal`). `failed`/`unrecoverable`
  → the Step 10 generation-failure treatment (already built, S10-A) or the screen's
  own tail.
- **Guard:** authed + `trial|active` (must have paid to be here); a `none` user hitting
  this route → back to Card Capture. A `trial|active` user whose voice is already
  `ready` → straight to Home B (first-run-only, §6.4).
- **New route:** `/app/voice/processing` (thin page.tsx + client poller + `/dev/processing`
  already exists). The old `/app/vault/sealed` retires with the rest of the arc (§5).

### 4.4 Vault Reveal — `/app/vault/reveal`
- **Screen:** **old `VaultRevealScreen`, temp-reused** (§6.1). It renders as the
  post-processing payoff to get the spine walkable end-to-end now; the proper
  relocated reveal (new Vault object) is the **next segment**, a non-blocking
  fast-follow. Do **not** delete `VaultRevealScreen` in §5 — it's load-bearing until
  the relocated version replaces it.
- **Guard change:** currently `trial|active → /app/record` (`reveal/page.tsx:15-17`).
  Invert as in §4.2 — the reveal is *for* a just-paid `trial` user. Allow trial/active
  through; a trial/active user whose voice is already `ready` and who has *seen* the
  reveal → Home B (first-run-only, §6.4); bounce `none`/lapsed elsewhere.
- **Exit:** onward → **First Breath** (`/app/record/complete`).

### 4.5 First Breath — `/app/record/complete`
- **Screen:** `FirstBreathSequence` (built, audio wired #91). No screen change.
- **Entry:** now reached from Reveal (§4.4) — closes the orphan.
- **Exit change:** `FirstBreathSequence.tsx:112` currently pushes
  `ROUTES.recordCompleteStub` (the "coming soon" dead end). Repoint to **first message
  creation** (`ROUTES.messagesNew`) per §4.4 immutable rule 4 (playback before first
  message) and handoff §4.
- **Retire:** `/app/record/complete/stub` — once the exit is repointed, the stub has
  no inbound edge; delete it + `ROUTES.recordCompleteStub` (FU #25). *Only after* the
  repoint lands (it's live today — see integration-map §E).

### 4.6 First Message onward — already wired
No change. `/messages/new` → A2→A6→A4→A7, cap → C3, etc. all connected.

---

## 5. Flags, Stripe URLs, and the old arc

- **Flag flips (same PR as the reorder):** `VOICE_CREATION_REQUIRES_PAYMENT=true`,
  `VAULT_STRIPE_ENABLED=true`. Gate `false→true` only lands atomically with §3/§4.
- **Stripe URLs** (`lib/stripe/create-checkout-session.ts:131-132`): `success_url`
  → Processing route (§4.3); `cancel_url` → Card Capture cancelled state (currently
  `/app/vault/protect?checkout=cancelled` — keep, now lands on the new screen).
- **Real price IDs:** `VAULT_PRICING` carries `PLACEHOLDER_*` ids — owner/ops swaps
  for real Stripe products at flip time (not a code task).
- **Retire the old arc:** `VaultProtectScreen` (replaced by CardCapture),
  `VaultContinuityScreen`, `VaultSealScreen`, `VaultSealedScreen` — once the new
  screens render, retire the leftover routes (`/app/vault/continuity`,
  `/app/vault/seal`, `/app/vault/sealed`) via redirect into the new path or 410, and
  delete the components + their `/dev` pages per CLAUDE.md.
  **KEEP `VaultRevealScreen`** — it's the temp-reused payoff (§6.1) and stays live
  until the relocated reveal replaces it in the fast-follow segment. Don't leave two
  arcs, but don't delete the one screen still in service.

---

## 6. Decisions — RESOLVED (owner, 2026-07-10)

**6.1 — Relocated Vault Reveal → TEMP-REUSE.** Wire the existing `VaultRevealScreen`
into the post-processing slot so the spine is walkable end-to-end now; build the
proper relocated reveal (new Vault object) as the **next segment** — a non-blocking
fast-follow (reveal is a payoff, not a gate). `VaultRevealScreen` is therefore KEPT
in §5, not retired.

**6.2 — "Not now" at Card Capture → DEFER TO A HOLDING STATE.** Declining parks the
user (Home A / a holding screen) with their recorded voice safe but unprocessed;
they can re-enter Card Capture anytime. Copy must be honest — the journey pauses,
nothing is processed, **no free tier is implied**. (This ties into the Home A
decision in the integration map §E P1 #6 — the holding state *is* Home A's job:
"all actions restricted to continuing the voice journey," MASTER_SPEC §6.5.)

**6.3 — Processing route → NEW `/app/voice/processing`.** Add the semantic route;
"sealed" must not mean "still waiting." Retire `/app/vault/sealed` with the old arc.
(Adding a new URL is allowed — the lock forbids *renaming* existing ones, not adding.)

**6.4 — First-run-only → YES.** A `trial|active` user with a `ready` voice skips the
whole spine and lands on Home B; they never re-enter Card Capture / Processing /
First Breath. The §4.2/§4.3/§4.4 guard inversions enforce it. Matches MASTER_SPEC
§6.5 (Home B only when voice `ready`). Re-training enrichment happens via CCY, not by
replaying the activation spine.

---

## 7. Build sequencing (chunks) + verification

Per CLAUDE.md: one chunk → one review surface → one commit; visual/live verify UI
before "done"; 4× CPU on mobile sim is the motion bar.

- **Chunk S1 — Card Capture wired at `/app/vault/protect`.** ✅ DONE (commit 622a540).
  New page.tsx + actions wrapper; `onKeep` → checkout; guard inversion; reference-clip
  exit repointed. Verified live (guard both branches, plan toggle, park/resume, mock commit).
- **Chunk S2 — split into S2a (additive) + S2b (cutover); gate flip deferred to S5.**
  - **S2a** ✅ DONE (4ed4bc7): new `/app/voice/processing` route + polling wrapper
    (triggers `/start`, polls to `ready`, → Reveal). Additive, off the live path.
  - **S2b** ✅ DONE (80b6e01): `success_url` + mock URL → processing; `voice/create`
    neutralized (no pre-payment `/start`); record/RecordScreen exits → Card Capture;
    processing honours `?mock=true` as paid (flags off). Verified live end-to-end
    (record → Card Capture → mock → processing → reveal).
  - **Gate flip** (`VOICE_CREATION_REQUIRES_PAYMENT` + `VAULT_STRIPE_ENABLED`) →
    **moved to S5** (owner-triggered, with a vendor-backed walk). The code is correct
    with flags off; the flip only closes the direct-`/start` free loophole.

  **Known transitional edges (resolve in S3/S5):** a paid-but-not-ready user who
  re-enters the record flow currently routes to Card Capture → (guard) home rather
  than back into processing; the `?mock=true` processing bypass is removed at S5.
- **Chunk S3 — Reveal (temp-reused) → First Breath → First Message.** ✅ DONE
  (commit 5a4d5e8). Reveal guard inverted; advance → First Breath; FirstBreathSequence
  exit repointed off the stub → `/messages/new`. Verified live: full walk record →
  Card Capture → mock → processing → Reveal → First Breath (See My Stone → Continue)
  → `/messages/new`. **The whole spine is now walkable end-to-end.**
- **Chunk S4 — Retire old arc + dead code.** ✅ DONE (commit 7080a03). Deleted the
  4 old-arc screens + their actions + `VoiceCreationView`; retired routes
  (`/app/vault/{continuity,seal,sealed}`, `/app/record/complete/stub`) → stable
  redirects to Home; dropped the dead plan helpers; trimmed `/dev/vault`. Verified:
  tsc/lint clean (no dangling refs), 374 tests, live redirect + Card Capture intact.
  Kept `recordCompleteStub` in ROUTES (now a redirect shim) rather than removing it.
- **Chunk S5 — Flip flags on for real + real price IDs (owner/ops).** Only after
  S1–S4 verified live. Analytics note per CLAUDE.md (monetization event moves).

**Telemetry:** the monetization event relocates (Step 3 card capture is now the
first paid ask, not the old seal). Drop a `docs/analytics/2026-07-10-*.md` note in
the S2 PR — the `VAULT_EVENTS` / journey beacons for the paywall move with it.

---

## 8. Risks

- **Atomicity of the flag flip.** If `VOICE_CREATION_REQUIRES_PAYMENT` flips before
  the reorder is live, the happy path 402s. Gate it strictly to S2+ and behind env
  until S1–S3 verify. (This is exactly why it's been held OFF.)
- **Guard inversions touch live routes.** The vault-route guards currently protect
  against mid-flow states; inverting them wrong could strand paid users. Each
  inversion gets a guard-matrix test.
- **Two arcs during transition.** Between S1 and S4 the old and new screens
  coexist. Keep the old arc unreachable (no inbound edge — it already has none) so
  users never hit it; delete in S4.
- **Reference-clip → card exit** must not regress the CCY/return-user flow (a
  partially-trained user returning shouldn't be shoved into Card Capture — §6.4
  guard handles it, but verify the CCY path explicitly).
