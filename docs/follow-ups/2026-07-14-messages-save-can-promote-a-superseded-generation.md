---
id: 2026-07-14-messages-save-can-promote-a-superseded-generation
priority: P3
status: open
opened: 2026-07-14
resolved:
summary: `/api/messages/save` never checks `superseded_at` (commit/regenerate both do via `isActivePending`), so a stale client can save a superseded draft as a permanent, immutable message *(triage 2026-07-14)*
---

# `/api/messages/save` can promote a superseded generation into a permanent message

*(triage 2026-07-14)*
`src/app/api/messages/save/route.ts:47-54` loads the pending generation but does **not** select or
check `superseded_at`. Its only "still valid" gate is the `saved_message_id` idempotency check (`:64`).
The other two routes that act on a pending generation both guard against superseded rows through the
shared helper: `src/app/api/messages/commit/route.ts:55` and `src/app/api/messages/regenerate/route.ts:58`
each call `isActivePending(gen)` (`src/lib/messages/route-helpers.ts:37-38`, which rejects when
`superseded_at` is set). The edit-note path in `src/app/api/messages/generate/route.ts:378` stamps
`superseded_at` on the prior lineage member. `/save` is the one mutating route that skips this check.

**Why it matters:** a client still holding an older `generationId` (a stale tab, a double-submit, or a
future edit flow that keeps prior drafts around) can call `/save` and permanently store the **superseded,
out-of-date** version of the message — text and audio — as a saved vault message. Saved messages are
immutable by design (a `DECISIONS.md` lock), so there's no clean undo: the user ends up with the wrong
version of their message locked in. It harms no one on today's one-tap happy path, but it's an
inconsistency the moment any edit/redo flow makes stale generation IDs reachable.

**Fix shape:** add `superseded_at` to the select and route the load through the same `isActivePending()`
predicate the other two routes use (placed after the `saved_message_id` idempotency short-circuit so an
already-saved message still returns idempotently). One-line-of-intent change; mirrors the sibling routes.

**Pick up when:** next Step 6 message-flow pass, or before any edit/redo flow ships that can leave a
client holding a superseded generation ID. Agent-fixable.
