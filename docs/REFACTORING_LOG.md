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

## 2026-07-17 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged **8** new per-file backlog items; no app code touched.
- Health on `main` (93d0bbd): typecheck ✅ · lint ✅ · test:unit 386/386 ✅ (run after a full
  `npm ci` — the container starts without dependencies, so the first check pass silently no-op'd;
  re-run against installed deps to report honestly).
- Scanned: the full existing backlog for dedup (FOLLOW_UPS.md 1–84 + the 21 per-file items on `main`,
  **plus the 8 still-unmerged items on `triage/2026-07-14`** and that run's explicitly-deferred list);
  marker-debt grep over `src/` (zero TODO/FIXME/HACK; every `eslint-disable` is documented/conventional);
  doc-drift spot-check (API_CONTRACTS.md describes an older route surface + a bucket name that disagrees
  with STORAGE_PATHS.md — judged a known early-stub doc, not logged as fresh debt); deep reads of four
  under-scanned clusters not covered by the 2026-07-14 pass: the audio/upload + message-audio helpers,
  the voice-profiles / voice-training pipeline, the infra/api layer (rate-limiter, defineRoute, analytics,
  /api/me), and the Stripe-portal / profile helpers.
- Excluded as work-in-progress (not logged): the active branches `fix/step6-cost-control-wedge` and
  `refactor/fu-93-*` (Step 6 generate/regenerate cost + wedge), `feat/step10-error-copy-pass`
  (Shelf / Home B), `feat/first-breath-audio` + `feat/s10c-*` (First Breath audio), `feat/legal-pages`
  (legal + offline), and `feat/s5-stripe-golive` (reveal/processing guards).
- Discovered (new per-file FOLLOW_UPS entries, all P3, most-money/security-relevant first):
  - `2026-07-17-db-rate-limiter-count-then-insert-bypasses-spend-caps` — the daily voice/message spend
    caps are count-then-insert, so concurrent requests all pass at once (cost-axis is P2-adjacent;
    scored P3 because the overshoot is bounded). Distinct site from the FU-81 / 2026-07-14 saved-message
    atomicity items.
  - `2026-07-17-loadreadyvoiceprofile-swallows-db-error-wedges-paid-flow` — a transient DB read error
    returns a terminal non-retryable "voice not ready" and hard-blocks regenerate/commit (the sibling
    `countActivePending` deliberately fails open; this one doesn't).
  - `2026-07-17-envint-treats-zero-as-invalid-defeats-cost-cap-killswitch` — `envInt` (duplicated in
    cost-controls.ts + rate-limit.ts) rejects `0`, so setting any cap to 0 to hard-stop spend silently
    reverts to the default.
  - `2026-07-17-portal-session-returnpath-backslash-open-redirect` — the same-origin guard rejects
    `//host` but not `/\host`; an attacker-supplied returnPath yields an off-site Stripe return_url.
  - `2026-07-17-elevenlabs-client-abort-orphans-billed-voice-no-reconcile` — the 60s client timeout
    records a definitive failure with no vendor reconciliation, so a voice ElevenLabs already billed is
    orphaned and the retry mints a second (distinct mechanism from the 2026-07-14 stale-window item).
  - `2026-07-17-getorcreatevoiceprofile-race-creates-duplicate-profiles` — check-then-insert with no
    unique constraint on `voice_profiles.user_id`; concurrent calls create two "Default" profiles and
    clips can attach to the wrong one. **Owner-paired** (clean fix is a migration).
  - `2026-07-17-no-tests-on-voice-spend-gating-backoff-download-clips` — the retry/backoff cap and the
    clip-download spend gate that govern billed ElevenLabs attempts have zero unit coverage.
  - `2026-07-17-audio-commit-downloads-whole-clip-just-to-read-its-size` — `audio/commit` downloads the
    entire uploaded object into memory only to read `blob.size` (egress waste + OOM risk per commit).
- Triggers that came true: none newly actionable this run.
- Deduped-out (found but already covered, NOT re-logged): Agent B's top "stale-processing 180s <
  maxDuration 300s → orphaned paid voice" finding is an **exact duplicate** of the P2
  `2026-07-14-voice-create-stale-threshold-shorter-than-max-duration` (same file/lines/mechanism — the
  agent's "recording vs request duration" distinction was wrong); the `/api/me` storage wipe 1000-object
  cap = FU-95; the delete-account error-swallowing sits in the already-4-deep teardown cluster
  (FU-85/86/88/95) and is non-prod-gated.
- Capacity note: **8 more lower-priority items** were found and deliberately **not** logged this run
  (8-entry cap): [P3] the rate-limiter classifies 429s by substring-matching user-facing copy and drops
  `checkSignedUrlLimit`'s `retryAfterMs`; [P4] `/api/analytics` accepts unbounded client `meta` with no
  body-size check; [P4] `getOrCreateProfile` vs `ensureProfile` duplicate get-or-create, only one
  race-safe; [P4·owner-paired] `reconcileCheckoutSession` reports "reconciled" even when the webhook
  handler wrote nothing; [P4] `download-clips` conflates a transient DB error with "no clips"; [P4] the
  `{userName}` resolver fallback substitutes the literal "I'm here" into a name slot; [P4] an
  empty-string blob MIME is uploaded to ElevenLabs as `.mp3`; [P3·owner-paired] `/api/me` DELETE
  swallows each delete's error (teardown-cluster adjacent). Re-surface next run if the top 8 drain.
- Branch / commit: `triage/2026-07-17` @ <this commit>
- Checks: n/a for the app (docs-only change); CI re-runs lint/typecheck/test/build + the followups-index
  check on the PR.
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
