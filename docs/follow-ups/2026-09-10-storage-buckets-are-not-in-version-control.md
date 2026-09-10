---
id: 2026-09-10-storage-buckets-are-not-in-version-control
priority: P2
status: open
opened: 2026-09-10
resolved:
summary: "No migration creates the storage buckets — `essence-audio` and `profile-photos` exist only because someone made them by hand in the dashboard, so a fresh environment has none and every upload fails with `Bucket not found` *(found running Step 5 live tests, 2026-09-10)*"
---

# The storage buckets are not in version control

*(found bringing up a local stack to run the Step 5 Chunk 2 checks)*

`supabase/migrations/*` · `src/lib/audio/storage-paths.ts`

Migrations **update** `storage.buckets` — `20260901120000_privacy_hardening.sql`
and `20260903170000_raise_avatar_size_limit.sql` both do — but **nothing ever
inserts them.** `essence-audio` and `profile-photos` exist in production only
because they were created by hand in the Supabase dashboard.

A freshly migrated database therefore has **zero buckets**, and every code path
that uploads fails with `Bucket not found`:

```
{"event":"voice_sample_upload_failed","errorCode":"STORAGE_FAILED",
 "meta":{"message":"Bucket not found"}}
```

This is exactly how it surfaced: the whole Step 5 live suite failed on it until
the bucket was created by hand locally too.

## Why it matters

1. **A new environment cannot work without undocumented manual setup.** Anyone
   running the stack for the first time hits it, and the error names storage
   rather than the missing provisioning step.
2. **The migrations that `update storage.buckets` are silently no-ops on a fresh
   database.** `raise_avatar_size_limit` matched zero rows locally. It applied
   cleanly and did nothing — the worst kind of green.
3. **Bucket configuration is not reviewable.** Public/private, size limits and
   MIME allowlists are security-relevant and currently live only in dashboard
   state. Nothing stops them drifting, and nothing records what they should be.

## Fix shape

A migration that inserts both buckets idempotently, with the configuration
production actually has:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('essence-audio', 'essence-audio', false, …, …),
       ('profile-photos', 'profile-photos', false, …, …)
on conflict (id) do nothing;
```

**Read the live values off production first** — do not guess the size limits or
MIME allowlists, and do not let this migration change them. The point is to
record what is already true so a fresh environment matches, not to redefine it.

Then re-check that the existing `update storage.buckets` migrations still
express what they meant to.

## Pick up when

Before anyone else sets up an environment, and before Step 5 ships — its render
path writes to `essence-audio` on every activated user.
