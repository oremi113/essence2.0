---
id: 2026-07-28-record-reducer-has-no-failed-terminal-branch
priority: P3
status: open
opened: 2026-07-28
resolved:
owner_paired: false
summary: The record "working" state machine has no `failed` terminal branch — `VOICE_PROFILE_STATUS_CHANGED` ignores every non-`ready` status and the 8s fallback timer unconditionally advances to `ready`, so a `failed` voice profile still shows "Ready to be kept" and pushes the user to the paywall *(triage 2026-07-28)*
---

# Record working-screen reducer has no `failed`-terminal branch → a failed voice advances to the paywall

*(triage 2026-07-28)*

`voice_profile_status` includes `failed` (`src/lib/profile/voice.ts:12`), but the record flow's state
machine never handles it:

- `RecordScreen.reducer.ts:99-102` — `VOICE_PROFILE_STATUS_CHANGED` returns the current state unless
  `action.status === 'ready'`; a `failed` status is silently ignored.
- `RecordScreen.reducer.ts:104-106` — `WORKING_TIMEOUT_ELAPSED` unconditionally moves `working → ready`.
- `RecordScreen.tsx:99-104` — an 8s `WORKING_FALLBACK_ADVANCE_MS` timer dispatches that timeout so the
  user is never stranded on the working screen. `deriveInitialView` (`reducer.ts:30-34`) likewise only
  special-cases `ready`.

Net: if the profile is (or becomes) `failed` while the user is on the working screen, the fallback
timer still declares success — the user sees "Your voice is yours. Ready to be kept." and is pushed to
`ROUTES.vaultProtect` (the paywall) despite the failure.

**Why it matters:** a user whose voice creation failed gets told it succeeded and is asked to pay —
the worst possible framing of a failure. **Reachability caveat:** voice creation is spec'd to run
post-paywall in the current spine, so `failed` may not always land inside this working-screen window;
the working screen does poll `voice_profile_status` (`RecordScreen.tsx:81-86`), so the transition is
observable here when it does occur. The missing terminal-failure branch in a shipping state machine
whose enum already carries `failed` is a real robustness gap either way — a landmine, not a confirmed
live leak.

**Fix shape:** add a `failed` view to the reducer — have `VOICE_PROFILE_STATUS_CHANGED` transition to
it, teach `WORKING_TIMEOUT_ELAPSED` / the fallback not to promote a `failed` profile to `ready`, and
handle `failed` in `deriveInitialView`. Render an honest "something went wrong, let's try again" state
instead of routing to the paywall. UI change → verify in-browser.

**Pick up when:** the connection pass that finalizes voice-creation → paywall routing (ties to FU-24 /
FU-25), or the next record-flow hardening pass.
