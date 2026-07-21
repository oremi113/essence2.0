---
id: 2026-07-21-active-pending-cap-nonatomic-toctou
priority: P4
status: open
opened: 2026-07-21
owner_paired: true
resolved:
summary: The "one active in-flight generation per user" cap is a read-then-insert with no DB constraint → a narrow cross-instance race can create two active pending rows → two concurrent paid renders + a path around the saved-message quota *(triage 2026-07-21)*
---

# Active-pending generation cap is non-atomic (read-then-insert TOCTOU)

*(triage 2026-07-21 — surfaced reading the Step 6 cost-control layer; same "read-then-act needs a DB uniqueness guarantee" class as the subscription dup-guard FU-81, different table)*

`src/app/api/messages/generate/route.ts:184` checks the cap with
`countActivePending(supabase, user.id) >= STEP6_LIMITS.maxActivePendingPerUser`, then inserts the pending
row later at `:237`. There is no unique constraint or atomic upsert enforcing the cap — and the helper
(`src/lib/messages/cost-controls.ts:102-119`) also **fails open** on a DB error. Two cold-start `/generate`
requests that land in the small window between the count and the insert both read below the cap and both
insert an active pending row.

**Why it matters:** two active pending rows means two concurrent paid ElevenLabs renders (duplicate vendor
spend) and, because the active-pending row is also the serialization that keeps the 3-saved-message vault
quota race-safe at `/save`, a worst-case path to exceeding that quota. The window is genuinely narrow — the
route-level ~5s in-memory dedup catches same-instance double-taps, so this needs two requests hitting
*different* serverless instances within tens of ms — so it's real but low-probability, not a live problem
today.

**Fix shape (owner-paired — requires a migration):** enforce the cap in the database with a partial unique
index (e.g. on `user_id` where `saved_message_id IS NULL AND superseded_at IS NULL`) so a second concurrent
insert fails atomically instead of racing a count; handle the resulting unique-violation as the same
`pending_max` block. Also stop failing open on the `countActivePending` query. **Never-touch note:** the DB
migration needs owner sign-off per the refactoring-system never-touch list — the agent flags, the owner
pairs on the migration. Pairs naturally with FU-81 (the subscription partial-unique-index work) as one
"make read-then-act caps atomic" migration pass.

**Pick up when:** the same migration pass that lands FU-81's partial unique index, or before scaling to
multi-instance production traffic where the cross-instance window widens.
