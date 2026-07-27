---
id: 2026-07-07-delete-account-teardown-erases-audio-before-the-row
legacy_id: 86
priority: P2
status: resolved
opened: 2026-07-07
resolved: 2026-07-27
summary: "Delete-account teardown erases audio *before* the DB/auth deletes → mid-teardown failure loses recordings under a \"Nothing was lost\" screen *(triage 2026-07-07)*"
---

# Delete-account teardown erases audio *before* the row/auth deletes → a mid-teardown failure loses recordings under a "Nothing was lost" screen

> **✅ RESOLVED 2026-07-27** (`refactor/fu-86-teardown-order`) — the reorder shipped.
> `deleteAccountAction` now runs the irreversible storage wipe **last**: Stripe
> cancel → FK-safe row deletes → auth-user delete → **storage wipe (best-effort)**.
> Any failure in the first three steps aborts into `{ ok: false }` while the
> recordings are still on disk, so the "nothing was lost" terminal stays truthful;
> a storage failure after the account is provably gone is logged as an orphan (for
> a later sweep) and no longer flips the result to failure. First test coverage for
> this teardown landed too (`tests/unit/settings-delete-account.test.ts`, 4 cases,
> each red against the pre-fix ordering). **Note:** the sibling landmines in the
> same function are still open — FU-85 (swallowed `subscriptions` read, `owner_paired`)
> and FU-88 (no server-side `ACCOUNT_DELETE_ENABLED` gate) — and should be closed
> before the flag flips.

*(triage 2026-07-07)*
`src/app/app/settings/actions.ts:215-245`; copy at `SettingsScreen.tsx:462-465`. Teardown
order is: Stripe cancel → **wipe audio + avatar storage (step 2, irreversible)** → row
deletes (step 3) → auth-user delete (step 4). If any step-3 `checkedWrite` throws or step-4
`auth.admin.deleteUser` errors, the action returns `ok: false` and the screen renders:
*"Your account is still here … Nothing was lost, and everything is just as it was."* That is
untrue once step 2 has run — the person's recordings and photo are already gone while the
account still works. The header's "aborts BEFORE any data loss" only holds for a *Stripe*
failure.
**Why it matters:** the highest-stakes screen reassures the user nothing was lost at the exact
moment their irreplaceable recordings *were* lost. Not live today (flag OFF).
**Fix shape:** do the irreversible step last — delete rows + auth user first, storage last (a
storage failure then just orphans objects for a later sweep), **or** soften the post-storage
failure copy so it doesn't promise "nothing was lost." Reorder is the real fix.
**Pick up when:** before `ACCOUNT_DELETE_ENABLED`; same batch as #85/#88.
