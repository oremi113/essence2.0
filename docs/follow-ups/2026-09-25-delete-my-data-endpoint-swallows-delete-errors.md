---
id: 2026-09-25-delete-my-data-endpoint-swallows-delete-errors
priority: P3
status: open
opened: 2026-09-25
summary: `DELETE /api/me` (the non-prod "wipe my data" reset tool) destructures only `count` from all five deletes and the storage removal, never `{ error }`, so a failed delete collapses to a count of 0 and the endpoint still returns 200 success — it cannot tell "nothing to delete" from "delete failed" *(triage 2026-09-25)*
---

# The "delete my data" test-reset endpoint reports success even when a delete fails

*(triage 2026-09-25 — API-route error-handling read; recurring swallowed-error class, new site)*

`src/app/api/me/route.ts:90-149` is the developer/QA data-reset tool. It is gated
to non-production (`NODE_ENV !== "production"`, line 46), a flag, and an
`x-confirm-delete` header — so it never runs against real users. Within it, every
destructive step reads only `count` and discards `{ error }`:

```ts
const { count: ueCount } = await service
  .from("usage_events").delete({ count: "exact" }).eq("user_id", user.id);
counts.usageEvents = ueCount ?? 0;
```

The same pattern repeats for all five table deletes and for the storage
`list`/`remove` block (lines 92-106). A Supabase `.delete()` that errors resolves
as `{ data: null, error, count: null }` rather than throwing, so on any failure
(RLS/permission, an FK `RESTRICT` from a table this route doesn't handle, a
transient blip) the error is silently swallowed, `count` falls back to `0`, and
the handler still returns `200 { deleted: counts }`. The endpoint therefore
cannot distinguish **"deleted nothing because there was nothing to delete"** from
**"deleted nothing because the delete failed."**

This is the same swallowed-error class the repo has fixed repeatedly on shipping
paths (FU-85 delete-account subscriptions read, the `getSubscriptionStatus`
family), but a distinct, un-logged site — and this one is a dev/QA endpoint, not
a user path, which is why it is P3 rather than higher.

**Why it matters:** this is the tool testers use to hand back a clean account
before a run. If a delete quietly fails, it cheerfully reports success while the
old data is still there — so people build and trust test runs on state that was
never actually cleared, and chase ghosts that are really leftover rows.

**Fix shape:** check `error` on each delete and on the storage `list`/`remove`; if
any step fails, log it and return a 500 with the partial tally instead of a 200
that claims success. Small, self-contained, testable.

**Pick up when:** next time this endpoint or the account-teardown code is touched,
or any pass hardening the QA/reset tooling. Low urgency (never runs in prod), but
a reset tool that can silently no-op is worth a ticket.
