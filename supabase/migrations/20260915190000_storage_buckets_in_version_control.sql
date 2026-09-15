-- Put the storage buckets in version control.
--
-- `essence-audio` and `profile-photos` have only ever existed because someone
-- created them by hand in the Supabase dashboard. Nothing in `supabase/`
-- declared them, so a fresh environment came up with zero buckets and every
-- upload failed with `Bucket not found`.
--
-- Resolves docs/follow-ups/2026-09-10-storage-buckets-are-not-in-version-control.md
--
-- The cost was not hypothetical. It has been paid twice:
--   * 2026-09-10 — the Step 5 live guard tests ran against a bucket-less stack.
--     Six calls produced six paid ElevenLabs renders that could never store
--     their audio, which is how the missing retry ceiling was discovered.
--   * 2026-09-15 — the row 41 iPhone setup hit it again. There it was worse
--     than a failure: a failed upload leaves First Playback silent, and silence
--     is exactly what a blocked-autoplay result looks like, so it would have
--     produced a confident wrong answer to the question under test.
--
-- It also silently defeated an earlier migration. `20260903170000_raise_avatar_
-- size_limit.sql` UPDATEs `profile-photos` to 15MB and matched zero rows in any
-- fresh environment, as its own header admits. Ordering fixes that: this
-- migration is dated after it, so a fresh database now creates the bucket at
-- 15MB directly and ends in the same state a migrated one does.
--
-- ── On the chosen values ────────────────────────────────────────────────────
--
-- `on conflict do nothing` is the important part. Production's buckets already
-- exist, configured by hand, and this migration must not reach in and change
-- them — it is here to make EMPTY environments match, not to redefine a live
-- one. Against production it is a no-op.
--
-- Because of that, the settings below only ever apply to a fresh environment,
-- and they are deliberately conservative:
--
--   * `public = false` — both buckets are served exclusively through signed
--     URLs (`createPlaybackSignedUrl`, the avatar signing path). A public
--     bucket would make every recording world-readable by object path, which
--     the privacy copy explicitly promises against.
--   * `file_size_limit` — 15MB on `profile-photos` is the one value that is
--     *proven*, since the 2026-09-03 migration states it. The app caps avatars
--     at 10MB (`AVATAR_MAX_BYTES`), so the bucket keeps headroom and the
--     friendly app-level error stays the one users see.
--   * `essence-audio` gets NULL (no per-bucket cap) and both get NULL
--     `allowed_mime_types` — the defaults a dashboard-created bucket receives.
--     This is on purpose rather than laziness: production's real values are not
--     knowable from this repo, and guessing a *tighter* limit than production
--     would make fresh environments reject uploads production accepts, which is
--     a worse failure than this migration not existing. The app validates
--     types and sizes itself before uploading.
--
-- If production's actual configuration is ever read back, tighten these to
-- match and note it here. Until then, permissive-and-correct beats
-- strict-and-guessed.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('essence-audio',  'essence-audio',  false, null,     null),
  ('profile-photos', 'profile-photos', false, 15728640, null)  -- 15MB, per 20260903170000
on conflict (id) do nothing;

commit;
