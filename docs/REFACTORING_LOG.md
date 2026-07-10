# Refactoring Run Log

Backward-looking journal of what the refactoring system has *done*, run by
run (newest first). Companion to `docs/FOLLOW_UPS.md` (what's still
*outstanding*) and governed by `docs/REFACTORING_SYSTEM.md` §8.

**In a pickle:** find the suspect change below, then tell a session
*"revert the change from log entry &lt;date&gt;"*. Every change is an isolated
commit that never auto-merged, so it reverts cleanly.

Entry template (the agent appends one per run):

```
## <YYYY-MM-DD> — <scheduled | on-demand | discovery>
- Outcome: <Fixed | Worked around | Scan-only | Run failed> — <one plain sentence>
- Item: FU-<n> — <title>
- Root cause: <symptom → cause → why this change addresses the cause>
- Branch / commit: <refactor/fu-n-slug> @ <short SHA>
- Checks: typecheck <✅/❌> · lint <✅/❌> · test:unit <✅/❌>
- Discovered: <new FU entries, or "none">
- Merged: <stamped later when the owner merges, with date>
```

---

## 2026-07-10 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged 8 new backlog items (FU-81–88), added a refining sub-note to FU-72, and noted 1 further P4 (restore checkout duplication) not logged. No code touched.
- Scanned: health checks on `main` (`1983bb9`): typecheck ✅ · lint ✅ · unit tests **370/370** ✅. Deep-read the subsystems that shipped since the last triage but were never read at depth — the Step 9 account-deletion teardown, the Step 3 vault-render / card-capture canvas engine, the Step 6 message-generation routes (cost-control + failure paths), the Step 10 gen-failure / offline surfaces, and the record / onboarding shared libs. Marker-debt grep over `src/`: no new untracked debt (the FirstBreath audio TODOs are FU-41, the exit-destination TODO is FU-25, every `eslint-disable` is conventional or FU-32).
- Excluded as work-in-progress: `feat/legal-pages` and `feat/first-breath-audio` (both last touched 2026-07-08) — the files they touch (legal screens/routes, FirstBreath audio) were treated as WIP. The freshly-merged Stripe lifecycle audit (#92 → FU-77/78/79) and S10-B offline (#89 → FU-80) were not re-scanned (already covered).
- Discovered (new FOLLOW_UPS entries):
  - FU-81 [P2, owner-paired] Account-delete teardown drops the `subscriptions` read error → a transient DB hiccup deletes the account while its Stripe subscription keeps billing (`settings/actions.ts:191`, breaks the step-1 "never billed" invariant).
  - FU-82 [P2, owner-paired] `retry_audio` renders paid ElevenLabs audio with no cost cap / hourly gate / ledger → an authenticated loop = unbounded vendor spend (`regenerate/route.ts:94-135`).
  - FU-83 [P2] A failed message generation permanently wedges creation — the orphaned active pending row 429s every retry via `pending_max`, forever (`generate/route.ts` + `MessagesNewPageClient.tsx:76`).
  - FU-84 [P3] Single-clip playback retry guard resets itself every fetch → an undecodable clip bursts the rate-limited playback endpoint (`RecordingUpload.tsx:263`).
  - FU-85 [P3] Account-delete storage wipe caps each prefix at 1000 objects with no pagination → a heavy user's audio survives "your voice has been erased" (`settings/actions.ts:263`).
  - FU-86 [P3] No unit tests on `RecordScreen.reducer` + `useSequenceTimeline` (central shipping logic + a reused timer primitive).
  - FU-87 [P3] The TTS→upload→duration→status pipeline is duplicated (`audio.ts` vs `commit/route.ts`) and will drift on a vendor-spend path.
  - FU-88 [P4] Onboarding draft-save persists the expiring `avatarUrl` signed URL to localStorage, violating the module's own "never persisted" contract (`state.ts:153`).
- Refined FU-72: two latent `useShimmerLoop.ts` bugs (shimmer transitions snap instead of tween at `:143`; dead `: ACTIVE` branch at `:175`) — inert until the real Processing clock lands, so noted as a sub-note rather than standalone entries.
- Reconciliation note for the fixer: `audio.ts:97-119` now **checks** its audio success-mark write on `main` — one of FU-66's three flagged sites appears resolved in code. Discovery does not strike; recommend the fixer verify + strike the resolved half.
- Triggers checked: FU-76 (legal → Settings) — Settings merged but `/privacy` `/terms` are still on the unmerged `feat/legal-pages`, so the trigger is blocked, not fired. FU-22 (voice payment gate) — Step 3 `CardCapture` exists but is only wired to `/dev/card-capture`, not a live pre-processing route, so still coupled/decision. FU-24 (VoiceCreationView → First Breath) — still routes to `messagesNew`, unchanged.
- Branch / commit: `triage/2026-07-10` @ <this commit>
- Checks: n/a (docs-only; CI re-runs lint/typecheck/test/build on the PR).
- Merged: <stamped later when the owner merges>

## 2026-06-22 — scheduled (scan-only)
- Outcome: Scan-only — the app is healthy and nothing was cleanly fixable this
  run. Every item near the top of the queue is already being handled in an open
  pull request, or is waiting on a decision/setup only the owner can give. No
  app code changed.
- Health checks on `main` (e49b075): typecheck ✅ · lint ✅ · test:unit 184/184 ✅.
- Marker-debt grep over `src/`: no new untracked debt — the FirstBreath audio
  TODOs are tracked (FU-41), the exit-destination TODO is FU-25, and every
  `eslint-disable` is documented/tracked (FU-32 for `useResource`, plus the
  conventional Next `<img>` / exhaustive-deps sites).
- Why no fix: walked the priority queue top-down. The first items
  (FU-5/1/2/4) are already fixed on `main` and struck in open PR #62; the next
  clean code fixes (FU-43 voice-ready persist check, FU-46 init-upload
  storage_path check, FU-45 signed-URL telemetry) are all fixed in open PR #61
  (Step 7 Memory Shelf + reliability). Re-fixing any of them would duplicate an
  open PR — a banned move. The remainder are blocked: FU-22 (PR #65, + payment
  decision), FU-54 (PR #58), FU-23/44 (Stripe-hardening branch), FU-25/34/24/16/
  12/28 (owner decisions), FU-26 (needs a Supabase access-token CI secret — owner
  setup), FU-59/60 (delete a locked URL path — owner sign-off, never-touch), and
  FU-40/57/35/41/8/6-server-half/56 (visual/asset work, not browser-verifiable in
  this environment).
- Scores: no priority change is warranted that isn't already captured in an open
  PR (#62 strikes FU-1/2/4/5; #61 resolves FU-42/43/45/46; #63 logs FU-59/60).
  `FOLLOW_UPS.md` deliberately left untouched here to avoid colliding with those
  in-flight backlog edits (§5 backlog-coordination).
- Verified-resolved-in-code (recommend striking when #62/#61 merge, to avoid a
  third divergent edit of the same file now): FU-7 (Screen10 sr-only
  `role="status"` announcement present) and FU-9 (Screen10 renders
  `displayUrl = preview ?? avatarUrl` for re-entry). Flagged by triage 2026-06-13
  for the fixer to verify+strike.
- PR hygiene note (§7): there are already 3 open system docs PRs (#54, #62, #63)
  plus several fix PRs (#61, #58, #65, #59) awaiting the owner's review. The queue
  is at the max-3 ceiling for docs PRs — draining it (merging the green ones)
  unblocks the next fix run more than any new branch would.
- Branch / commit: refactor/scan-2026-06-22 @ <this commit>
- Discovered: none (the 2026-06-16 and 2026-06-19 triage passes + the 06-19
  bug-hunt already captured the open findings).
## 2026-06-19 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged 2 new backlog items; no code touched.
- Scanned: health checks on `main` (typecheck ✅ · lint ✅ · test:unit 184/184 ✅);
  marker-debt grep over `src/` (all TODOs/disables already tracked or deliberate —
  the `guards.ts` `assertPlanAllows` stub is a documented MVP hook, not debt); deep
  reads of the cost-control / rate-limit layer (sound — fail-open is documented and
  deliberate), the vault pricing struct, and the full `src/app/api/` route map for
  orphaned endpoints.
- Excluded as work-in-progress: a heavy in-flight week — 7 open PRs (#61 Step 7
  Memory Shelf + the FU-42/43/45/46 unchecked-write batch; #58 durable ceremony
  flag → FU-54; Stripe-hardening → FU-23/44; #59 analytics funnel; #62; prior
  triage #54). All files those branches touch were treated as WIP. The prior triage
  PR #54 already logged the Step 6 generate-pipeline unchecked-write finding and the
  stale-Step-6-doc-comment finding — deliberately NOT re-logged (dedup). New numbers
  start at 59 to avoid colliding with #54's pending #58.
- Discovered (new FOLLOW_UPS entries):
  - FU-59 [P3] Legacy message-creation API orphaned by M0 — `POST /api/messages` +
    status-poll `GET /api/messages/:id` mounted but unreachable; the deleted
    `NewMessageView` (M0/#55, commit 48079d8) was their sole caller. POST still spends
    ElevenLabs with no Step 6 cost cap.
  - FU-60 [P4] Dead `POST /api/onboarding/complete` route — superseded by the
    `completeOnboarding` server action (FU-42 path); stamp-only partial duplicate, no caller.
- Triggers came true: none newly actionable on `main` (FU-34's trigger was already
  resolved on `main` by M0/#55; the prior triage #54 flagged it pre-M0).
- Reviewed-and-cleared: cost-control/rate-limit layer, `VAULT_PRICING` placeholder
  price IDs (display-struct cruft, checkout uses env IDs), and the live audio-upload
  / voice-profiles / Step 6 routes — no entry warranted.
- Branch / commit: `triage/2026-06-19` @ <this commit>
- Checks: n/a (docs-only; CI re-runs lint/typecheck/test/build on the PR).

## 2026-06-17 — scheduled (scan + backlog reconciliation)
- Outcome: Scan-only — no code fix was needed; the top of the fixable queue was
  already done and the rest is blocked. Corrected a stale backlog so it no longer
  points the owner at work that already shipped.
- Item: FU-5 [P3] (the designated "next up") — and the three queue items behind
  it (FU-1, FU-2, FU-4). All four turned out to be **already resolved on `main`**
  in commit `35d7372` (2026-06-11 "safe FOLLOW_UPS batch"), with test coverage,
  but were never struck here — so the priority table still advertised them as the
  next fixable work. This run verified each in code and recorded the strikes.
- Root cause (of the stale backlog): symptom — `FOLLOW_UPS.md` listed FU-5/1/2/4
  as the "next-up fixable queue" a week after they shipped. Cause — the 2026-06-11
  batch fixed the code but didn't update the backlog's resolution strikes or the
  ranked table. Why this change addresses it — the four entries are now struck
  with the resolving commit, and the table reflects real status (resolved /
  in-open-PR / blocked-on-owner-setup / overlaps-active-work) so the next run
  starts from an accurate queue. No app code was touched.
  - Verified resolved in code on `main`: FU-5 — `useUploadPipeline.ts` has a
    distinct `'cancelled'` status + `isAbortError` guard, and the unit test asserts
    cancel → `'cancelled'` (not `'failed'`); FU-1 — `RecordingUpload.tsx` uses the
    adjust-state-during-render pattern, zero `eslint-disable`; FU-2 — its catch
    path calls `resetPipeline()`; FU-4 — `audio/commit/route.ts` dropped the
    `AUDIO_BUCKET` fallback + import.
- Why nothing else was fixable this run: FU-26 (the only remaining code item near
  the top — a CI drift-check for generated DB types) needs a Supabase access token
  added as a GitHub Actions secret, which only the owner can provision (§4 "ask
  first"); shipping the check without it would turn CI red. Everything else open is
  blocked on owner decisions (FU-22/25/16/28/12), overlaps active feature branches
  (FU-23/24/44 on stripe/analytics streams), is resolved-in-code awaiting an open
  PR merge (FU-43/45/46 → PR #61, FU-54 → PR #58), or is UI/visual work needing
  in-browser verification this environment can't do (FU-7/8/9/56/57).
- Branch / commit: refactor/fu-5-reconcile-resolved-batch @ <stamped on commit>
- Checks: typecheck ✅ · lint ✅ · test:unit ✅ (184/184). Docs-only change; no
  behavior change, no browser verification needed.
- Discovered: none new. Reconciliation only — corrected the status of FU-1/2/4/5
  (resolved on main) and re-scored FU-23/26/43/44/45/46/54 in the table to match
  in-flight PRs and active branches.
- Merged: <stamped later when the owner merges>

## 2026-06-16 — scheduled (fix)
- Outcome: Fixed — onboarding's final "save my details" step used to navigate the
  user into the app even when the save silently failed, losing everything they
  typed; it now stops and lets them retry.
- Item: FU-42 [P2] — Onboarding completion swallows a failed save → profile silently lost.
- Root cause: symptom — a new user finishes onboarding, the profile write fails
  (RLS / transient DB / constraint), and they're sent into the app anyway with
  their name/DOB/city gone and `onboarding_completed_at` still null (treated as
  not-onboarded next visit). Cause — the `completeOnboarding` server action ran
  the `profiles` UPDATE but never inspected the returned `{ error }`, so a failed
  write resolved as success; the expired-session branch (`if (!user) return;`)
  likewise resolved silently. Why this addresses the cause — the write now goes
  through `persistOnboardingCompletion`, which throws on a returned error, and
  the expired-session branch throws too. A thrown action rejects the client
  `await`, so `router.push` is skipped and the existing `OnboardingScreen`
  `try/catch` keeps the user on the final screen with their draft intact. This
  fixes the swallow at its source (the unchecked error), not a downstream symptom.
- Branch / commit: refactor/fu-42-onboarding-save-check @ 1971c6c
- Checks: typecheck ✅ · lint ✅ · test:unit ✅ (184/184; +3 new in
  tests/unit/complete-onboarding.test.ts). Non-visual change (server action +
  helper); no browser verification needed.
- Discovered: FU-57 [P4] — onboarding completion failure now resets the wizard
  silently (no visible "couldn't save, try again" message). Logged, not fixed
  (UI copy → needs in-browser verification, out of scope for this run).
- Merged: <stamped later when the owner merges>

## 2026-06-13 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged 5 new backlog items; no code touched.
- Scanned: health checks on `main` (typecheck ✅ · lint ✅ · test:unit 154/154 ✅);
  marker-debt grep over `src/` (all pre-existing TODOs already tracked); deep
  reads of the Stripe/subscription, voice-creation/ElevenLabs, audio-upload
  pipeline, onboarding, and auth/profile subsystems. Active feature branch
  `feat/step6-a6-screen` (the whole Step 6 message-creation flow) was treated
  as work-in-progress and excluded.
- Discovered (new FOLLOW_UPS entries):
  - FU-42 [P2] Onboarding completion swallows a failed save → profile silently lost.
  - FU-43 [P3] Voice-creation success doesn't verify its DB write → "ready" reported while stuck "processing".
  - FU-44 [P3] Checkout customer-id save unchecked → duplicate Stripe customers on retry.
  - FU-45 [P4] Signed-URL routes log usage "success" before the work that can fail.
  - FU-46 [P3] init-upload storage_path write unchecked → breaks commit; + dead extension ternary.
- Triggers came true: Screen 10 went live with real avatar upload — FU-6
  (object-fit half shipped), FU-7 and FU-9 appear implemented (flagged for the
  fixer to verify + strike; discovery does not strike).
- Reviewed-and-cleared: Stripe webhook handlers + `upsertSubscription` are
  correctly error-guarded and idempotent — no entry warranted.
- Branch / commit: `triage/2026-06-13` @ <this commit>
- Checks: n/a (docs-only; CI re-runs lint/typecheck/test/build on the PR).
- Merged: <stamped later when the owner merges>

## 2026-06-13 — system setup (on-demand, by Claude + owner)
- Outcome: System hardened — not an agent fix run. Recorded for traceability.
- Added: band-aid safeguards + root-cause discipline, the in-flight-branch
  skip rule, honest-verification + backlog-coordination rails, this run
  log, and a `test:unit` step in CI so the agent's "checks pass" claim is
  independently verified by GitHub.
- Branch / commit: `harden/refactoring-system` (this branch)
- Checks: n/a (docs + CI config only)
- Note: first scheduled fix run is Monday 2026-06-15 06:00 ET; a one-off
  test run was also triggered on 2026-06-13. Their entries will appear
  above this line.
