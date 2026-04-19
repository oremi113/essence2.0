-- 20260418_add_avatar_storage
-- Onboarding photo (Screen 10): the wizard captures an optional profile
-- photo. Stored in the private `profile-photos` bucket (server-authored
-- path), surfaced via short-lived signed URLs. Mirrors the audio storage
-- pattern (storage_bucket + storage_path columns, never inline blobs).
--
-- Bucket creation lives in the Supabase Dashboard:
--   Storage → New bucket → name `profile-photos`, set to private.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_storage_bucket text,
  ADD COLUMN IF NOT EXISTS avatar_storage_path   text;

COMMENT ON COLUMN profiles.avatar_storage_bucket IS
  'Bucket holding the profile photo (currently always `profile-photos`). '
  'Stored alongside path so future migrations can move buckets without '
  'rewriting client code.';

COMMENT ON COLUMN profiles.avatar_storage_path IS
  'Object path inside avatar_storage_bucket. Pattern: '
  'users/{userId}/avatar.{ext}. Server-authored only.';
