-- Raise the profile-photos bucket cap 5MB -> 15MB.
--
-- The old 5MB mirrored the old 2MB app cap (AVATAR_MAX_BYTES); both were too
-- small for modern phone photos (iPhone 16 Pro JPEGs ~3-8MB). App cap is now
-- 10MB; the bucket keeps 15MB of headroom so the app-level check stays the one
-- that produces the friendly error. UPDATE matches zero rows in a fresh env
-- (bucket created via dashboard) — see FOLLOW_UPS #104 / the privacy-hardening
-- migration header.
begin;

update storage.buckets
   set file_size_limit = 15728640  -- 15 MB
 where id = 'profile-photos';

commit;
