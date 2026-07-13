---
id: 2026-07-10-a-failed-message-generation-permanently-wedges-creation-the
legacy_id: 93
priority: P2
status: resolved
opened: 2026-07-10
resolved: 2026-07-13
summary: A failed message generation permanently wedges creation — the orphaned active pending row 429s every retry via `pending_max`, forever *(triage 2026-07-10)*
---

# A failed message generation permanently wedges creation — the orphaned pending row 429s every retry

> ✅ **RESOLVED 2026-07-13** (`refactor/fu-93-failed-generation-wedges-creation`). Root
> cause: the cold-start `/generate` path claims the user's single active-pending slot by
> inserting the row *before* text/audio run, but its three terminal-failure branches
> (`:287` text, `:317` text-mark, `:357` audio) returned 502 without ever releasing that
> slot — so a dead attempt counted as an in-flight flow forever and every fresh-cold-start
> retry 429'd on `pending_max`. Fix (chosen shape #1): a new
> `retireFailedPendingGeneration` helper (`src/lib/messages/route-helpers.ts`) stamps
> `superseded_at` on the failed row in each of the three branches, releasing the slot —
> `superseded_at` is exactly the "no longer active" flag `countActivePending` /
> `isActivePending` / the g/[id] view guard already honour, so the dead row stops counting
> and can't be reopened. Best-effort (a failed cleanup must not mask the failure already
> being returned). Also fixes the control-arm edit-note failure, which inserts a new row the
> same way. Unit-tested in `tests/unit/messages-route-helpers.test.ts` (3 cases: stamps
> `superseded_at` scoped to generation+user, folds a terminal `text_status`, best-effort on a
> failed write). typecheck ✅ · lint ✅ · test:unit 389/389 ✅.
>
> *Residual (not a new bug, strictly better than before):* if the cleanup write itself also
> fails (DB down at that instant) the slot still lingers — inherent to any row cleanup and
> logged via `bestEffortWrite`; the common failure case (generation failed, DB healthy) is
> fully released.

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
