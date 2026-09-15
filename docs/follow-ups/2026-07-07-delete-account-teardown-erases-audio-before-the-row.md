---
id: 2026-07-07-delete-account-teardown-erases-audio-before-the-row
legacy_id: 86
priority: P2
status: open
opened: 2026-07-07
resolved:
summary: "Delete-account teardown erases audio *before* the DB/auth deletes → mid-teardown failure loses recordings under a \"Nothing was lost\" screen *(triage 2026-07-07)*"
---

# Delete-account teardown erases audio *before* the row/auth deletes → a mid-teardown failure loses recordings under a "Nothing was lost" screen

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

**Refinement 2026-09-15 (triage):** still open and unchanged in substance after the
2026-09-01 teardown rewrite (commit 519b45f). That rewrite inserted an ElevenLabs
clone-delete step but kept the irreversible storage wipe ahead of the row/auth
deletes, and left the "Nothing was lost" failure copy intact. Line refs have
drifted: the storage wipe is now step 3 at `src/app/app/settings/actions.ts:258-268`,
the row deletes are step 4 at `:270-280`, and the auth-user delete is step 5 at
`:284`. The reorder (or copy softening) fix shape above still applies as written.
