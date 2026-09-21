---
id: 2026-08-11-onboarding-back-not-disabled-during-photo-upload
priority: P3
status: open
opened: 2026-08-11
resolved:
summary: "Onboarding Screen 10 Back is not disabled during a photo upload - a mid-upload back-out desyncs the wizard avatar state *(triage 2026-08-11, salvaged from the monolith 2026-09-21)*"
---

# Onboarding Screen 10 Back control isn't disabled during a photo upload → a mid-upload back-out desyncs the wizard's avatar state

*(triage 2026-08-11 - originally written into the legacy `docs/FOLLOW_UPS.md`
monolith by PR #127, which never landed. Salvaged into the per-file ledger on
2026-09-21 and verified to have no existing per-file entry before copying.)*

`src/components/screens/OnboardingScreen.tsx:165` — `<BackButton … disabled={isSubmitting} />`, where
`isSubmitting` is only the Screen 12 completion flag, so the global Back stays live during a Screen 10
upload (only Screen 10's own file input + Continue CTA are gated by `inFlight`). Combined with
`src/components/screens/onboarding/usePhotoUpload.ts:130` (`if (!mountedRef.current) return;` *before*
`onSuccess`) and the `key={currentScreen}` remount wrapper (`OnboardingScreen.tsx:171`).

**Why it matters:** If the user taps Back while a photo upload is in flight, Screen 10 unmounts after the
server action commits `avatar_storage_path` but before the client records it — so `onSuccess`/`setAvatarUrl`
never runs and in-session `form.avatarUrl` stays null. The Screen 9 review card and any re-entry to Screen
10 then show *no* photo even though one is saved, inviting a confused re-upload. No permanent data loss (the
avatar re-hydrates as a signed URL on the next full page load) — the harm is in-session only.

**Fix shape:** Suppress/disable the Back control while a Screen 10 upload is in flight (surface `inFlight` up
to the orchestrator, or block navigation during upload) so the uploader can't be unmounted between the server
commit and the `onSuccess` callback.

**Pick up when:** next onboarding-polish or Screen 10 touch. Agent-fixable, but the fix is UI-behavioral —
verify in-browser (mid-upload Back at 4× throttle) per the house visual-verification bar.
## 2026-08-11 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged 8 new backlog items (FU-104–111); no code touched.
- Scanned: health checks on `main` @ 93d0bbd (typecheck ✅ · lint ✅ · test:unit 386/386 ✅);
  marker-debt grep over `src/` (17 hits, all pre-existing justified `eslint-disable`s, none
  new/untracked); no `feat/*` branch was ahead of `main` this run, so nothing excluded as
  work-in-progress. Deep reads (parallel subsystem audits, each finding verified against source
  before logging): Stripe/subscription webhook + checkout + restore; voice-creation / ElevenLabs
  cost paths (`/voice-profiles/[id]/start`, `rate-limit.ts`, `persistVoiceReady`); Step 6 message
  routes (`generate`/`commit`/`save`/`regenerate`/`discard`); onboarding state machine + First
  Breath telemetry + analytics route.
- Discovered (new FOLLOW_UPS entries):
  - FU-104 [P2 · owner-paired] Webhook writes transient `incomplete` as terminal `lapsed`; terminal
    guard then blocks the real `active` write → paid-but-locked-out + double-bill on restart.
  - FU-105 [P3] Voice `/start` stale-window (180s) < `maxDuration` (300s) → in-flight billed request
    torn down, then "ready" reported over a `failed` row → orphaned paid voice + 2nd billed voice.
  - FU-106 [P3] Voice-creation daily cost cap fails open on DB error (only server ceiling on billed
    ElevenLabs voice-clone; sub-gate flag-OFF) → a `usage_events` incident uncaps all users at once.
  - FU-107 [P3] `messages/save` orphans the copied permanent-audio object on non-`23505` insert
    failure; fresh UUID per retry → each failed-retry drops another dead copy.
  - FU-108 [P3 · owner-paired] Stale/duplicate `invoice.payment_failed` can drag a recovered `active`
    row back to `past_due` → false dunning banner until the next `subscription.updated`.
  - FU-109 [P3] First Breath `sequence_completed` never fires for reduced-motion users → funnel reads
    ~100% abandonment for the accessibility segment.
  - FU-110 [P3] `messages/commit` renders paid audio with no `usage_events` ledger row and no hourly
    gate (only the per-generation render cap) → committed spend invisible to the cost fence + analytics.
  - FU-111 [P3] Onboarding Screen 10 Back isn't gated by an in-flight upload → mid-upload back-out
    desyncs in-session avatar state (self-heals on reload).
- Triggers came true (flagged for the fixer/owner to verify + strike — discovery never strikes):
  - FU-25 — First Breath's `/complete/stub` exit was replaced by the spine (`FirstBreathSequence.tsx:139`
    → `ROUTES.messagesNew`); the destination decision is effectively made. Residual dead code: the
    `recordCompleteStub` route constant + `app/record/complete/stub/page.tsx` are now orphaned (P4).
  - FU-24 — the referenced `VoiceCreationView` component no longer exists (deleted in spine S4;
    `/app/voice/create` is now a clean redirect). The routing concern is moot.
- Reviewed-and-cleared (no entry warranted): signed-URL/commit/playback IDOR (all enforce
  `row.user_id === user.id`); the per-profile concurrent double-charge is correctly blocked by the
  `processing` monotonic lock; the analytics route is genuinely best-effort and `track()` never throws;
  `useResource` aborts stale requests correctly; `useSequenceTimeline`'s onEnter double-fire guard holds;
  `firstBreathAudio` degrades to silence on every failure without leaking the context; the FU-42/43/45/46
  fixes are present and correct.
- Branch / commit: `triage/2026-08-11` @ <this commit>
- Checks: n/a (docs-only; CI re-runs lint/typecheck/test/build on the branch/PR).
- Merged: <stamped later when the owner merges>
