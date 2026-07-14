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

## 2026-07-14 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged **8** new per-file backlog items; no code touched.
- Health on `main` (93d0bbd): typecheck ✅ · lint ✅ · test:unit 386/386 ✅.
- Scanned: full existing backlog (FOLLOW_UPS.md 1–84 + the 21 per-file items) for dedup;
  marker-debt grep over `src/` (zero TODO/FIXME/HACK; every `eslint-disable` is documented
  or conventional — house rule holding); deep reads of the Stripe/subscription subsystem,
  the audio-upload + voice-profile pipeline, the messages API (save/commit/regenerate/generate),
  the rate-limiter, and the onboarding/profile/settings layer. Doc-drift spot-check on
  `STORAGE_PATHS.md` (bucket contract still matches, FU-28 unchanged).
- Excluded as work-in-progress: the active fix branches `refactor/fu-93-failed-generation-wedges-creation`
  and `fix/step6-cost-control-wedge` (Step 6 message-generation cost/wedge — FU-92/93), the Step 10
  error-copy / first-breath-audio streams (`feat/step10-*`, `feat/s10c-*`), and the shimmer-loop
  latent bugs already recorded under the §72 refinement — none re-logged.
- Discovered (new per-file FOLLOW_UPS entries, most-severe first):
  - [P2] `2026-07-14-voice-create-stale-threshold-shorter-than-max-duration` — the voice-create
    "timed out" threshold (3 min) is shorter than the route's own 5-min run budget, so a
    slow-but-successful **paid** voice can be marked failed while the client is still told "ready"
    (ElevenLabs billed, voice ID dropped, row reads failed). Reopens the FU-43/#66 class via a
    mismatched constant.
  - [P3] `2026-07-14-messages-save-can-promote-a-superseded-generation` — `/save` never checks
    `superseded_at` (commit + regenerate both do via `isActivePending`), so a stale client can save
    a superseded draft as a permanent, immutable message.
  - [P3] `2026-07-14-get-subscription-status-reports-none-on-db-read-error` — a DB read error collapses
    into `status: 'none'`, so a paying user can be treated as unpaid during a transient blip.
  - [P3] `2026-07-14-failed-voice-create-attempts-count-against-daily-cap` — the daily voice-creation
    cap counts events by action and ignores outcome, so rejected attempts (that never call ElevenLabs)
    can self-lock a fumbling user out for 24h.
  - [P3] `2026-07-14-saved-message-cap-is-check-then-insert-not-race-safe` — the vault cap is a
    count-then-insert labeled "race-safe"; concurrent saves of different generations can exceed it
    (FU-81 atomicity class, vault-limit path).
  - [P3] `2026-07-14-onboarding-completion-and-avatar-writes-ignore-zero-row-updates` — the completion
    + avatar-pointer writes check only for `error`, not zero rows; on a missing profile row the save is
    a silent no-op and the user's details/photo are lost (the branch FU-42's fix left open).
  - [P3 · owner-paired] `2026-07-14-billing-period-desyncs-after-a-customer-portal-plan-switch` —
    `billing_period` is trusted from checkout-time Stripe metadata that Stripe never rewrites on a
    Portal plan switch; the fix lives in webhook logic (never-touch) → flagged, owner-led.
  - [P4] `2026-07-14-messages-save-orphans-the-copied-audio-on-insert-failure` — only the unique-violation
    branch cleans up the copied audio object; any other insert error orphans it in storage.
- Triggers that came true: none newly actionable this run. FU-42's sibling gap (onboarding zero-row
  write) is surfaced above rather than as a trigger promotion.
- Deduped-out (found but already covered, not re-logged): a non-atomic delete-account teardown with a
  misleading "Nothing was lost" screen (= FU-86); a `DELETE /api/me` storage wipe capped at 1000
  objects/folder (= FU-95).
- Capacity note: **7 more lower-priority items** were found and deliberately **not** logged this run
  (8-entry cap): a webhook terminal-guard fail-open (belt-and-suspenders vs FU-79/81); an init-upload
  re-init storage orphan (P4); a Settings "remove photo → no way to re-add" dead-end (likely a FU-12
  decision, not clean debt); a `ui_flags` last-write-wins clobber (P4); a dead/misleading `/settings`
  match in `middleware.ts` (owner-paired cosmetic); the init-upload signed-URL limiter asymmetry (low
  practical impact — uploads are serialized by the sequential-prompt gate); and an in-memory dedup
  that can 429 an honest retry (minor). Re-surface next run if the top-8 drain.
- Branch / commit: `triage/2026-07-14` @ <this commit>
- Checks: n/a for the app (docs-only change); CI re-runs lint/typecheck/test/build on the PR.
- Merged: <stamped later when the owner merges>

---

## 2026-06-29 — scheduled
- Outcome: Fixed — two shipping Step 6 source comments described behaviour the
  code no longer has; both now match what the code actually does.
- Item: FU-67 — Stale Step 6 doc-comments contradict the shipped code.
- Root cause: symptom — a maintainer reading `PreviewRefinePageClient.tsx` is
  told "C3 (Vault Limit) isn't built, so a vault-limit save lands on Home," and
  reading `speech-duration.ts` is told "nothing measures real audio duration /
  no duration column," when both statements are now false. Cause — the comments
  were written before the Chunk 8 C3 screen (FU-38) and the FU-37 duration
  column shipped; the code changed but the explanatory comments were not updated
  alongside it. Why this addresses the cause — the comments are rewritten to
  describe the current routing (vault-limit save → C3 at
  `/messages/limit?from=save_race`; discard → Home) and the current duration
  measurement (`pending_generations.audio_duration_ms`, derived in
  `mp3-duration.ts`), so the documentation matches the code. No behaviour, type,
  or test surface changes — comments only.
- Branch / commit: refactor/fu-67-stale-step6-comments @ 23d927b
- Checks: typecheck ✅ · lint ✅ · test:unit ✅ (see run below).
- Scanned / discovered: re-ran the §3 scan. FU-66 (Step 6 unchecked success
  writes, the top open P3) is already fully fixed on `main` by commit 9e5ce2d
  (#70, the unchecked-write prevention pass) — all three success-path writes in
  `audio.ts`, `generate/route.ts`, and `regenerate/route.ts` now check `{ error }`;
  its FOLLOW_UPS entry body was never struck (table reconciled this run, body
  strike still pending). No new untracked marker debt found. No other clean
  agent-fixable code item outranks FU-67 (the higher items are owner decisions,
  M2-coupled wiring, infra, or URL-removal deletions).
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
