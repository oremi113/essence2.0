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

## 2026-06-16 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged 2 new backlog items + refined/promoted 1 existing; no code touched.
- Scanned: health checks on `main` (typecheck ✅ · lint ✅ · test:unit 181/181 ✅). The Step 6
  message-creation spine — excluded as WIP on `feat/step6-a6-screen` last pass — merged to `main`
  (PRs #49 + #51, 2026-06-15), so it was reviewed as shipping code this run. No active `feat/*`
  branch currently. Deep reads: the new `/messages/*` page-layer data-shuttles, the
  generate/regenerate/save/discard/waitlist API routes, the A6 reducer + A5 screen, the new lib
  helpers (mp3-duration, speech-duration, audio).
- Triggers came true: **FU-34** — the Step 6 spine is now live on `/messages/new`, but every app
  surface (TabNav, MemoryShelf, VaultSealed, record page, VoiceCreationView) still routes to the
  legacy `/app/messages/new` → the new flow is unreachable from app navigation. Refined #34 and
  promoted it (its "overlaps active work" caveat is now stale; the repoint is safer post-merge).
  Adjacent connection-pass triggers #24 and #25 are also now met. Still owner-decision items
  (which route is canonical; the FirstBreath exit destination) — not agent-fixable.
- Discovered (new FOLLOW_UPS entries):
  - FU-57 [P3] Step 6 generate pipeline reports success without checking its `pending_generations`
    status writes (`audio.ts:87`, `generate/route.ts:301`, `regenerate/route.ts:257`) → a paid
    render is reported "ready" but not persisted; A6's page guard bounces the user. Same
    unchecked-write class as #42–#46, new subsystem.
  - FU-58 [P4] Stale Step 6 doc-comments — C3 "isn't built" and FU-37 "no duration column" now
    contradict the shipped code.
- Reviewed-and-cleared: the `/save` route (recipient promotion → audio copy → immutable insert →
  mark → delete, idempotent + race-guarded) and the `/waitlist` route (unique-violation handled as
  idempotent success) — correctly guarded, no entry warranted. A6 reducer + A5 screen clean + tested.
- Branch / commit: `triage/2026-06-16` @ <this commit>
- Checks: n/a (docs-only; CI re-runs lint/typecheck/test/build on the PR).
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
