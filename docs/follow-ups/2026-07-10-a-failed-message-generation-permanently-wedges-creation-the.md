---
id: 2026-07-10-a-failed-message-generation-permanently-wedges-creation-the
legacy_id: 93
priority: P2
status: resolved
opened: 2026-07-10
resolved: 2026-08-31
summary: A failed message generation permanently wedges creation — the orphaned active pending row 429s every retry via `pending_max`, forever *(triage 2026-07-10)*
---

# A failed message generation permanently wedges creation — the orphaned pending row 429s every retry

**— ✅ RESOLVED 2026-08-31 (refactor/fu-93-orphaned-pending-row)** — root-cause fix, not a
band-aid. New `src/lib/messages/retireFailedGeneration.ts` stamps `superseded_at` on the
just-created pending row in all three cold-start failure branches of
`src/app/api/messages/generate/route.ts` (text-failed, text-mark-failed, audio-failed), so the
failed row stops counting in `countActivePending` and the A5 "Try again" (a fresh cold-start
`/generate`) no longer 429s on `pending_max`. Scoped by `generation_id` + `user_id` +
`.is('saved_message_id', null)` (never retires a saved row) and best-effort (an error-path
cleanup must not throw over the failure it follows). Unit-tested in
`tests/unit/retire-failed-generation.test.ts` (4 cases). typecheck + lint + unit (390/390) green.
*Residual, inherent not deferred:* if the text-mark write AND its retire write both fail in the
same transient blip, the row stays active — a far narrower window than the original (every
failure wedged), and self-heals on any later successful supersede. Original entry below.

*(triage 2026-07-10)*
`src/app/api/messages/generate/route.ts` (cold-start `:184`, insert `:237`, failure returns
`:287/:323/:357`) + `MessagesNewPageClient.tsx:76-92` (the A5 "Try again"). Cold-start inserts the
`pending_generations` row *before* text/audio run; if text or audio then fails, the route returns
502 but the row stays **active** (`saved_message_id` + `superseded_at` both null) — exactly what
`countActivePending` counts (`cost-controls.ts:102-111`). `superseded_at` is only set on an edit
*success* (`:372`), and no sweep clears failed rows. The A5 retry re-POSTs a fresh cold-start
`/generate`, which hits `countActivePending >= maxActivePendingPerUser (1)` → `pending_max` 429.
**Why it matters:** one transient LLM/TTS failure on the core creation flow leaves an orphan active
row that makes "Try again" fail with `pending_max` **forever** and blocks **every future message**
(cap is one active flow per user). A user-visible dead-end on a shipping main flow.
**Fix shape:** on a failed generation, discard/supersede the failed pending row (stamp
`superseded_at` or delete it) so it stops counting; or route the A5 retry through `/regenerate`
against the existing `generationId` instead of re-POSTing a cold-start.
**Pick up when:** soon — shipping-path user lockout. Next Step 6 spine touch. Agent-fixable.
