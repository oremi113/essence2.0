---
id: 2026-07-10-account-delete-storage-wipe-caps-each-prefix-at
legacy_id: 95
priority: P3
status: open
opened: 2026-07-10
resolved:
summary: "Account-delete storage wipe caps each prefix at 1000 objects with no pagination → a heavy user's audio survives \"erased\" *(triage 2026-07-10)*"
---

# Account-delete storage wipe caps each prefix at 1000 objects with no pagination

*(triage 2026-07-10)*
`src/app/app/settings/actions.ts:263` (called from teardown at `:217`) — `listAllStorageObjects`
does `service.storage.from(bucket).list(prefix, { limit: 1000 })` and recurses per sub-folder, but
never paginates within a prefix (no `offset`/continuation loop). If any single prefix holds >1000
objects, only the first 1000 are removed; the auth user is then deleted regardless.
**Why it matters:** the delete terminal tells the user "your voice … [has] been erased" on a
privacy-sensitive flow. A heavy long-term user could exceed 1000 objects under one
`users/{userId}/…` prefix, leaving real recordings orphaned in storage after the account and its
rows are gone — contradicting the erasure promise, with no row left to trace them by. Low frequency
at MVP volumes, but a privacy/erasure correctness gap on an irreversible flow.
**Fix shape:** loop `list` with an incrementing `offset` (or sort+cursor) until a short page returns,
accumulating all paths before the `remove`.
**Pick up when:** before launch (privacy/erasure), or the next settings/storage pass. Pairs with #85.
