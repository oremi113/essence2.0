# Integration Map — full-journey wiring (Steps 1→10)

**Date:** 2026-07-10
**Purpose:** The authoritative navigation graph for wiring the built screens into
one navigable app (roadmap M4). This is the *precondition* for the stitch: it
names every node, edge, and guard, and — critically — surfaces the seams where
the journey is **not actually connected** yet.

**Sources:** a read-only route/guard sweep + a cleanup verification pass, both
cross-checked against code on `main` (b99a9e4). Where the sweep made a
consequential claim (the paywall entry, the ceremony handoff), it was
re-verified by hand — see §E.

---

## TL;DR — the headline

**Every journey screen exists. The spine that connects them does not.** Three
built flows are islands with no production edge in or out:

1. **The First Breath ceremony is orphaned.** Voice-training completion
   (`VoiceCreationView`) routes to `/messages/new` or `/app/record` — **never to
   `/app/record/complete`**, the ceremony host. In production, no one reaches First
   Breath except via the `/dev` page or a direct URL.
2. **First Breath dead-ends at a stub.** Its only exit is
   `FirstBreathSequence.tsx:112 → /app/record/complete/stub`, a static "Voice
   Vault coming soon" placeholder (FOLLOW_UPS #25) with no onward navigation.
3. **The paywall/subscribe flow has no front door.** Nothing anywhere navigates
   into `reveal → protect → continuity → seal → sealed`. The only reference to
   those routes outside the vault pages themselves is a sign-in *fallback* in the
   Stripe API route.

**This is the money moment of V1** ("prove people pay $12.99 for Vault"), and it
is precisely the disconnected segment. The stitch is not glue between finished
screens — it is *building the spine at the paywall* plus reconnecting the ceremony.

**Fuller finding (2026-07-10):** the *entire* monetization spine is built as
screens but 0% wired, and it's blocked on a **decided-but-unbuilt reorder**
(card-capture-before-processing). The Step 3 Card Capture + Processing screens
(`screens/step3/*`) exist only at `/dev/*` — **no production route** (`ROUTES` has
no `cardCapture`). The payment gate (`VOICE_CREATION_REQUIRES_PAYMENT`) is held OFF
because today every user is `none` at voice-creation, so the app currently
**creates voice with no payment** — the free path §Step 3 forbids. What the roadmap
logged as "Step 3 ✅ done (#73/#81)" shipped the *screens*, not the *wiring*.

→ **The wiring plan for this whole segment is `docs/session-stitch/spine-wiring-spec.md`.**

**First Breath audio IS built** (verified after syncing local `main`, which was 3
commits stale). `src/lib/audio/firstBreathAudio.ts` (procedural Web Audio engine,
PR #91) is imported and wired in `FirstBreathSequence.tsx:8`, with a
`/dev/first-breath-audio` tuning page + unit test. FU #41 is genuinely resolved;
owner ear-review is the only remaining step. Step 10 **S10-C** (First-Breath
playback-error state) is therefore **unblocked** — the audio exists to error on.

> **Note on staleness:** an earlier draft of this map claimed the audio was
> unbuilt. That was a false read of a local `main` that trailed origin by 3 PRs
> (#91 audio, #92 Stripe lifecycle hardening, #94 docs). All findings below are
> re-verified against synced code. The *structural* gaps (orphaned ceremony,
> dead-end exit, no paywall entry) held; only the audio finding was wrong.

---

## §A — Route → Screen → Step

Excludes `/dev/*` and `/api/*`. "Step" = journey step per MASTER_SPEC.

| Step | Route | Screen / client component |
|---|---|---|
| — | `/` | inline "Phase 0 scaffold" — orphan landing, no nav |
| Auth | `/auth/sign-in` | inline `SignInForm` (magic-link OTP) |
| Auth | `/auth/callback` (route handler) | magic-link exchange → `?next` or `/home` |
| 1 | `/onboarding` | `OnboardingScreen` |
| Hub | `/home` | Home B: `HomeBScreen` (voice ready) · **Home A inline stub** (not ready) |
| 2 | `/app/record` | `RecordScreen` / `RecordPageShell` |
| 2 | `/app/voice/create` | `VoiceCreationView` |
| 3 | `/app/record/complete` | `FirstBreathSequence` (ceremony host) |
| 3 exit | `/app/record/complete/stub` | inline `CheckoutStub` — "coming soon" **dead end** |
| 4 | `/messages/new` | `MessagesNewPageClient` (A2→A4 orchestrator) |
| 4 (legacy) | `/app/messages/new` | permanent `redirect` → `/messages/new` (FU #34) |
| 4 A6 | `/messages/new/g/[generationId]` | `PreviewRefineScreen` |
| 4 A4 | `…/g/[generationId]/reshape` | `ReshapeNotePageClient` |
| 4 A7 | `/messages/saved/[messageId]` | `SaveConfirmation` · `ThreeShaped` (C1) |
| 4 C3 | `/messages/limit` | `VaultLimitScreen` |
| 4 C2 | `/messages/waitlist` | `WaitlistPageClient` |
| 5 | `/app/vault/reveal` | `VaultRevealScreen` |
| 5 | `/app/vault/protect` | `VaultProtectScreen` |
| 5 | `/app/vault/continuity` | `VaultContinuityScreen` |
| 5 | `/app/vault/seal` | `VaultSealScreen` |
| 5 | `/app/vault/sealed` | `VaultSealedScreen` |
| 5 | `/app/vault/restore` | `RestoreActions` |
| 6 | `/app/shelf` | `ShelfPageClient` |
| 7 | `/app/settings` | `SettingsScreen` |
| 10 | `error.tsx` · `global-error.tsx` · `not-found.tsx` | `SystemScreen` |

---

## §B — Guard matrix (gates before render)

Constants: `SubscriptionStatus = none|trial|active|past_due|lapsed|cancelled`
(`src/lib/vault.ts:11`); `STEP6_LIMITS.maxSavedMessages = 3`
(`src/lib/messages/cost-controls.ts:51`).

| Route | Auth | Other gates → destination |
|---|---|---|
| `/onboarding` | → signIn | `onboarding_completed_at` set → `/home` |
| `/home` | → signIn | no onboarding → `/onboarding`; voice not `ready` → **Home A stub**; else derive vault pill |
| `/app/record` | → signIn | `past_due` → retry banner; voice `ready` → `/app/voice/create` |
| `/app/voice/create` | → signIn | — |
| `/app/record/complete` | → signIn | no voice → `/app/record`; `archived` → `/home`; `created\|failed` → `/app/record` |
| `/app/record/complete/stub` | **none** (middleware `/app` only) | — |
| `/messages/new` | → signIn | no ready voice → `/app/voice/create`; **savedCount ≥ 3 → `/messages/limit`** |
| `/messages/new/g/[id]` | → signIn | flag off / bad id / not succeeded → `notFound` or `/messages/new`; saved → A7 |
| `…/reshape` | → signIn | `edit_note_depth ≥ max` → back to A6 |
| `/messages/saved/[id]` | → signIn | not-owner/not-saved → `notFound`; C1 ceremony only if `?ceremony` + at cap + unseen |
| `/messages/limit` | → signIn | **inverse cap: savedCount < 3 → `/messages/new`** (loop guard) |
| `/messages/waitlist` | → signIn | — |
| `/app/vault/{reveal,protect,continuity,seal}` | → signIn | `trial\|active → /app/record`; `lapsed\|cancelled → /app/vault/restore` |
| `/app/vault/sealed` | → signIn | `?session_id` polls sub ≤3s; direct-nav + not trial/active → `/app/vault/reveal` |
| `/app/vault/restore` | → signIn | `trial\|active → /app/record`; `none → /app/vault/reveal`; else render restore |
| `/app/shelf` | → signIn | `?saved=1` fresh-settle flag |
| `/app/settings` | → signIn | data-load failure → error view |

**Cap enforced in 3 places** (consistent): A2 entry (`messages/new:85`), C3 inverse
(`limit:49`), race-safe server gate in `/api/messages/save` (surfaced as the
`save_race` 403 in `PreviewRefinePageClient.tsx:224`).

---

## §C — Journey graph: intended vs actual

**Intended spine (MASTER_SPEC):**
`onboarding → record → voice/create → FIRST BREATH → [paywall: reveal→protect→
continuity→seal→Stripe→sealed] → messages/new → … → shelf`, with `/home` as the
returning hub.

**Actual wired edges** (✅ = connected, 🔴 = broken/missing):

- ✅ signIn → `/home` (callback default)
- ✅ `/onboarding` → `/app/record` (onComplete)
- ✅ `/app/record` → `/app/voice/create` (voice ready)
- 🔴 **`/app/voice/create` → FIRST BREATH** — MISSING. Completion goes to
  `/messages/new` (`VoiceCreationView:258`) or `/app/record`, skipping the ceremony.
- 🔴 **FIRST BREATH → paywall** — MISSING. Exits to the static stub
  (`FirstBreathSequence:103`), which has no onward nav.
- 🔴 **anything → paywall (`/app/vault/reveal`)** — MISSING. No forward entry to
  the subscribe flow at all.
- ✅ paywall internal chain reveal→protect→continuity→seal→sealed (once entered)
- ✅ seal → Stripe → `/app/vault/sealed?session_id=…`; sealed → `/messages/new`
- ✅ Home B hub → create / restore / shelf / settings / waitlist
- ✅ message-creation sub-graph (A2→A6→A4→A7, C1/C2/C3) — fully wired incl. cap
- ✅ shelf / settings / restore / system screens

**So the connected app today is two islands:** (1) onboarding→record→voice and
the Home-B hub-and-spokes (create/shelf/settings), and (2) the paywall chain —
with **no bridge between them**, and the ceremony stranded outside both.

---

## §D — Middleware (`middleware.ts`)

- Refreshes the Supabase auth cookie on every matched request (`updateSession`).
- **Protected paths:** `startsWith("/app") || === "/home" || === "/settings"`.
  Unauth → `redirect /auth/sign-in?next=<path>`.
- **Not** middleware-guarded (self-guard in page.tsx): `/onboarding`,
  `/messages/*`, `/auth/*`, `/`.
- No path rewrites. `/api/*` is matched (cookie refresh) but never "protected" —
  API auth is each route's own job.
- Stale: the literal `"/settings"` branch guards a path no page renders (real
  route is `/app/settings`, covered by the `/app` prefix). Harmless.

---

## §E — Seams & gaps, prioritized (the wiring punch-list)

**P0 — blocks the core journey / money moment**

1. **Wire voice-training completion → First Breath ceremony.**
   `VoiceCreationView` ready-state currently jumps past `/app/record/complete`.
   Decide the trigger (first-time-only? after N clips?) and route into it.
   *Verified:* `VoiceCreationView.tsx:258` → `/messages/new`; no edge to the ceremony.
2. **Build First Breath → paywall handoff (replace the stub).**
   `/app/record/complete/stub` is a placeholder (FU #25). This is the seam where
   the ceremony should hand into `/app/vault/reveal` (or the correct paywall
   entry). *Verified:* `FirstBreathSequence.tsx:103` is the only ceremony exit.
3. **Give the paywall a front door.** Nothing routes into
   reveal/protect/continuity/seal. Confirm the intended entry (First-Breath
   handoff per #2, and/or a Home-B/trial-expiry prompt) and wire it.
   *Verified:* no inbound edge to any vault-subscribe route in `src`.

**P1 — journey completeness**

4. **Step 10 S10-C (First-Breath playback-error state) is now buildable.** The
   ceremony audio exists (PR #91, `firstBreathAudio.ts` wired in
   `FirstBreathSequence.tsx:8`), so the error state can be built against it. Only
   open sub-item: owner ear-review of the procedural audio via
   `/dev/first-breath-audio`.
5. **A5 "Generating" wait-state has no screen.** `/messages/new/g/[id]` bounces
   back to `/messages/new` when text/audio aren't `succeeded` yet (header TODO
   `g/[id]/page.tsx:9`). If deferred-audio is on in prod, the wait needs a real state.
6. **Home A decision.** Inline stub at `home/page.tsx:67–79` for
   `voice.status !== 'ready'`. Build its brief or fold into Home B for V1.

**P2 — hygiene / telemetry / readability**

7. `/app/record/complete/stub` has no auth guard in its page.tsx (relies on the
   middleware `/app` prefix); every sibling `/app` page self-guards.
8. `/messages/limit` direct-nav silently reads as `from=a2_entry` — attribution
   seam, not a routing break.
9. Sealed "Go home" routes to `/app/record`, not `/home` (intentional — send the
   just-subscribed user to record more — but label/route mismatch).
10. `/` root scaffold is an orphan; middleware `"/settings"` literal is dead.
11. Legacy `/app/messages/new` → `/messages/new` redirect persists (FU #34) —
    resolved, but two paths for one concept remain.

---

## §F — Shared-state model (what the seams carry)

- **Auth:** Supabase cookie, refreshed by middleware; `signInWithNext(route)`
  round-trips the user back to the gated route after magic-link.
- **Subscription status:** `getSubscriptionStatus()` (the entitlement
  abstraction — access reads this, never Stripe directly). Drives every vault
  gate + Home B's pill. This is the single source of truth for "is the vault
  protected," so wiring the paywall means routing *on this value*, not on ad-hoc flags.
- **Message cap:** `savedCount` vs `STEP6_LIMITS.maxSavedMessages` (3), enforced
  at 3 layers (§B). C1/C3 ceremonies key off the same count.
- **Plan selection:** carried through the paywall as `?plan=` query
  (`vaultSealWithPlan` / `vaultContinuityWithPlan`), consumed by Stripe checkout.
- **Ceremony/first-run flags:** `three_shaped_ceremony_seen_at`,
  `onboarding_completed_at`, voice `status`, `?saved=1` fresh-settle — all
  server-read gates. First Breath needs an equivalent "ceremony seen" flag if
  it's first-time-only (decision in P0 #1).

---

## §G — Prep that must clear before wiring 1→10

- [ ] **Decide the three P0 seams** (owner calls, §H) — these define the spine.
- [ ] **Home A decision** (P1 #6).
- [ ] Owner ear-review of First Breath audio via `/dev/first-breath-audio` (P1 #4).
- [ ] Consolidated Step 10 error-copy pass (deferred until surfaces settled —
      they have now).
- [ ] Leave the stub in place until #2 is designed (it's the seam, not dead code).

**Already done (don't re-scope):** First Breath audio (#91), Stripe
subscription-lifecycle hardening trial→active→lapse→restore (#92) — both on
`main` as of the 2026-07-10 sync.

## §H — Owner decisions the map forces

1. **Does voice-training completion go through First Breath every time, or
   first-time-only?** (Determines whether we need a "ceremony seen" flag.)
2. **Where does First Breath hand off — straight into the paywall, or to a
   home/hub that then offers the paywall?** (Determines the P0 #2/#3 wiring.)
3. **What triggers the paywall besides First Breath** — trial expiry? a Home-B
   prompt? (V1's monetization surface.)
4. **First Breath audio** — built (#91). Only open call: does the procedural
   audio pass your ear at `/dev/first-breath-audio`, or does it need tuning
   before S10-C ships? (No build decision — just sign-off.)
