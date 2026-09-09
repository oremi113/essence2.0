-- Step 5 · First Playback — the cached neutral voice sample.
--
-- MASTER_SPEC Step 5 requires the user to hear their own preserved voice before
-- being asked to write anything (Immutable Journey Rule 4). The beat has never
-- existed in code — see docs/follow-ups/2026-09-08-first-playback-beat-was-never-built.md.
--
-- §4.3 of docs/Step5_First_Playback_Design_Handoff.md, answered in
-- prototypes/essence-step5-first-playback.html: render ONCE during processing,
-- the moment vendor_voice_id lands, and cache it on the profile. Rendering on
-- tap would put a several-second spinner at the most emotionally loaded moment
-- in the app; caching also answers §4.5 ("can they hear it again later?") for
-- free, without a second paid render.
--
-- Every render is a paid ElevenLabs call, so the trigger has to be idempotent
-- against a refresh, a double-tap, or a back-navigation. `sample_audio_path`
-- alone cannot express that: two concurrent callers would both read null and
-- both bill. `sample_status` exists to be CLAIMED by a conditional update, which
-- is what makes the render single-flight. `sample_render_count` is the evidence
-- that it worked — a value above 1 means we double-billed a user and the guard
-- has a hole.
--
-- All nullable / defaulted: every existing profile predates this beat.

begin;

alter table public.voice_profiles
  add column sample_audio_path text,
  add column sample_duration_ms integer,
  add column sample_status text not null default 'none',
  add column sample_render_count integer not null default 0;

alter table public.voice_profiles
  add constraint voice_profiles_sample_status_check
  check (sample_status in ('none', 'rendering', 'ready', 'failed'));

comment on column public.voice_profiles.sample_audio_path is
  'Storage object path (essence-audio bucket) of the cached First Playback sample — the neutral line spoken in the user''s own preserved voice. Null until rendered. No Message object is ever created for it.';

comment on column public.voice_profiles.sample_duration_ms is
  'Measured duration of sample_audio_path, in ms (derived from CBR mp3 byte length, same as pending_generations.audio_duration_ms). Null for unrendered or failed samples.';

comment on column public.voice_profiles.sample_status is
  'Render lifecycle for the First Playback sample: none | rendering | ready | failed. Claimed by a conditional update so a paid render is single-flight — a refresh or double-tap must not bill twice.';

comment on column public.voice_profiles.sample_render_count is
  'Number of times a paid render was actually issued for this profile. Expected to be 0 or 1; anything higher means the single-flight claim has a hole and a user was double-billed.';

commit;
