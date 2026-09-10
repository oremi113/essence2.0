-- Step 5 · First Playback — per-word timings for the cached sample.
--
-- The beat's claim is that the words resolve AS THEY ARE SPOKEN. Until now the
-- reveal ran off a cadence table hand-timed against a single reading of the
-- line, scaled at playback to the audio's total length. That fixes when the
-- line ends but not where the words fall inside it: measured against a real
-- clone the residual error was up to 141 ms, mean 54 ms, against a syllable of
-- roughly 150-250 ms.
--
-- ElevenLabs returns per-character timings from the /with-timestamps endpoint
-- for the same synthesis and the same cost. Collapsed to word onsets, they go
-- here.
--
-- These belong to ONE render. The same text in the same voice comes back a
-- different length each time (2043 ms and 2229 ms on two consecutive calls), so
-- the offsets are only valid for the audio at sample_audio_path and must be
-- rewritten or cleared whenever that audio is.
--
-- Nullable: every sample rendered before this migration has none, and the
-- screen falls back to the scaled table when it is absent.

begin;

alter table public.voice_profiles
  add column sample_word_offsets jsonb;

comment on column public.voice_profiles.sample_word_offsets is
  'Word onsets for sample_audio_path, in ms from the start of the audio, as a JSON array of integers — one per whitespace-separated word of sample_line. Derived from the ElevenLabs with-timestamps alignment for that exact render; invalid for any other audio. Null means fall back to the scaled cadence table.';

commit;
