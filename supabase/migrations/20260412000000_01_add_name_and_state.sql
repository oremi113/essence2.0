-- 20260412_01_add_name_and_state
-- Session 4 follow-up: capture first name, last name, and US state during
-- onboarding. Powers more personalized voice prompts and future location-
-- based features.
--
-- display_name stays as the canonical "First Last" string for backward
-- compatibility. Voice-training prompt resolution should prefer first_name
-- for the {userName} placeholder because the context is warm and personal.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text,
  ADD COLUMN IF NOT EXISTS state      text;

COMMENT ON COLUMN profiles.first_name IS
  'First name. Preferred source for {userName} in voice-training prompts.';

COMMENT ON COLUMN profiles.last_name IS
  'Last name. Used with first_name to compose display_name.';

COMMENT ON COLUMN profiles.state IS
  '2-letter US state code (e.g. CA, NY). Captured for location-based '
  'personalization. Null for users who onboarded before this column existed.';
