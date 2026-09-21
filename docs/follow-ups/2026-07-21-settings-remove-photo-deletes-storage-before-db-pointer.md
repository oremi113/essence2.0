---
id: 2026-07-21-settings-remove-photo-deletes-storage-before-db-pointer
priority: P4
status: open
opened: 2026-07-21
resolved:
owner_paired: false
summary: Settings `removePhotoAction` deletes the storage object *before* clearing the DB pointer → a partial failure leaves the profile pointing at a deleted avatar (broken image) under a false "your photo is unchanged" message *(triage 2026-07-21)*
---

# `removePhotoAction` deletes storage before clearing the DB pointer → orphaned avatar + false "unchanged" copy

*(triage 2026-07-21 — surfaced auditing settings/account actions; same ordering class as the delete-account audio-before-row item, but a separate un-logged path)*

`src/app/app/settings/actions.ts:131-148` removes the avatar in the wrong order:

1. `service.storage.from(bucket).remove([path])` — deletes the object first (`:133-135`).
2. `checkedWrite(... update({ avatar_storage_bucket: null, avatar_storage_path: null }))` — clears the DB
   pointer second (`:142-148`).

If the storage delete succeeds but the DB update then throws (RLS / transient), the `catch` (`:152-155`)
returns *"That didn't go through. Your photo is unchanged. Try again."* — but the photo is in fact already
deleted from storage while the profile row still points at the now-missing object.

**Why it matters:** on that partial failure the Settings screen then signs a URL for a deleted path and
shows a broken image, directly contradicting the "unchanged" copy the user was just shown. No data is
permanently lost (the avatar is re-uploadable and a retry reconciles it, since the row still carries the
bucket/path), so impact is low — but it's a truthfulness bug on a user-facing action: the app asserts
nothing changed while the avatar is gone.

**Fix shape:** clear the DB pointer first via `checkedWrite`, then remove the storage object best-effort
(log-only on failure, like the account-teardown "best-effort storage wipe" pattern). That way a partial
failure never leaves a pointer to a deleted object and the reported outcome stays truthful — worst case is
a harmless orphaned storage object, not a broken pointer plus a false message.

**Pick up when:** next settings/account-actions work, or folded into the same pass that fixes the
delete-account storage-before-row ordering (FU-86) — they share a root pattern.
