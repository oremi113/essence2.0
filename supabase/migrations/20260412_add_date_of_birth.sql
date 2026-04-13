-- 20260412_add_date_of_birth
-- Session 4 rebuild: capture full date of birth during onboarding.
--
-- Voice training only needs birth_year (for the generation variant in
-- prompts) but collecting the full date opens future features such as
-- birthday message reminders. We keep birth_year as a first-class column
-- so existing queries (/app/record) don't need to change.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;

COMMENT ON COLUMN profiles.date_of_birth IS
  'Full DOB (MM/DD/YYYY) captured during onboarding. Used for future '
  'birthday-message features. birth_year is still the canonical value '
  'for voice-training prompt resolution.';
