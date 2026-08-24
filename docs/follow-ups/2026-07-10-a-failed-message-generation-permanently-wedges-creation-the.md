---
id: 2026-07-10-a-failed-message-generation-permanently-wedges-creation-the
legacy_id: 93
priority: P2
status: resolved
opened: 2026-07-10
resolved: 2026-08-24
summary: A failed message generation permanently wedges creation — the orphaned active pending row 429s every retry via `pending_max`, forever *(triage 2026-07-10)*
---

# A failed message generation permanently wedges creation — the orphaned pending row 429s every retry

> ✅ **RESOLVED 2026-08-24** (`refactor/fu-93-orphan-pending-wedge`) — root-cause fix, not a
> workaround. Each cold-start failure exit in `POST /api/messages/generate` (text-failed,
> text-mark-failed, audio-failed) now calls `discardFailedGeneration` (new helper in
> `src/lib/messages/route-helpers.ts`), which stamps `superseded_at` on the just-created row so
> `countActivePending` stops counting it — freeing the one-active-flow slot the A5 cold-start
> retry needs. The `/regenerate` `retry_audio` recovery path and the shared
> `generateAndStoreAudio` helper are deliberately left untouched (their rows are recoverable
> in-place at A6, and the A6 page already redirects a `superseded_at` row to a fresh
> `/messages/new`). Covered by `tests/unit/messages-route-helpers.test.ts`
> (`discardFailedGeneration`); typecheck + lint + unit (388) green.

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
