-- ============================================================
-- V2 Voice Training Script: profile fields + training clip metadata
--
-- Adds:
--   profiles.city              – user's city for {city} placeholder
--   profiles.birth_year        – user's birth year for generation variant
--   training_clips.resolved_variant_keys – optional debug metadata (JSONB)
--
-- Columns are nullable for backward compatibility with existing rows.
-- The POST /api/voice-profiles endpoint enforces all fields as required
-- for new profiles going forward.
-- ============================================================

-- Add city and birth_year to profiles for V2 script dynamic resolution
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year int
  CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2025);

-- Add optional resolved_variant_keys for debugging on training_clips
-- Example value: {"timeOfDayKey":"morning"} or {"generationKey":"1980s"}
ALTER TABLE public.training_clips
  ADD COLUMN IF NOT EXISTS resolved_variant_keys jsonb;
