-- Session 8 Amendment A1 (Deferred Audio Render): committed-vs-candidate state.
--
-- Additive columns on pending_generations so a single row can hold BOTH the
-- committed take (the last text+audio the user heard — existing generated_text /
-- template_variant / audio_path / audio_status) AND an uncommitted candidate
-- (text only, no audio yet). Under DEFERRED_AUDIO_ENABLED, regenerate/"Try
-- another" writes a candidate for free; "Hear this in your voice" (/commit)
-- renders it and promotes it to the committed take.
--
-- All columns are nullable / default 0, so the control-arm code (audio-on-every-
-- regenerate, shipped + smoke-proven) ignores them and is unaffected. The two
-- models coexist during the A/B. See docs/session-8/Step6_OpenContracts.md
-- Amendment A1 (§A1.3) for the full state model and the rejected alternatives.

begin;

alter table public.pending_generations
  add column candidate_text             text,
  add column candidate_template_variant text,
  add column text_reroll_count          int not null default 0,
  add column audio_render_count         int not null default 0;

comment on column public.pending_generations.candidate_text is
  'Deferred Audio (A1): the current uncommitted text variant on screen — text only, no audio. Promoted to generated_text (the committed take) on /commit success; cleared on "Keep the current one". Ephemeral in the sense that it never becomes a messages row unless committed. Null when no candidate is being previewed.';

comment on column public.pending_generations.candidate_template_variant is
  'Deferred Audio (A1): the template variant id behind candidate_text. Promoted to template_variant on /commit success. Null when no candidate is active.';

comment on column public.pending_generations.text_reroll_count is
  'Deferred Audio (A1): count of free "Try another" text re-rolls within this generation. Soft-capped at MAX_TEXT_REROLLS (default 10). Distinct from the paid audio_render_count and from the control-arm regenerate_count.';

comment on column public.pending_generations.audio_render_count is
  'Deferred Audio (A1): count of paid voice renders within this generation (first listen + each committed candidate). Hard-capped at MAX_AUDIO_RENDERS (default 3) — the cost driver. cost_limit_blocked keys off this under the flag.';

commit;
