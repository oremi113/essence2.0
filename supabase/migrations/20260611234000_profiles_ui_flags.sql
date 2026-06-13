-- Per-user UI latches (FOLLOW_UPS #36).
--
-- A6 (Preview & Refine) needs two per-USER latches — "tap-to-play hint
-- learned" and "first arrival seen" — which Chunk 2 shipped as interim
-- per-device cookies. This column makes them durable per-user. A single
-- jsonb bag (not one boolean column per latch) so future screens can add
-- latches without another migration; keys are namespaced by screen
-- (e.g. a6_play_hint_learned, a6_visited).
--
-- Latches only ever flip false→true, so concurrent read-modify-write from
-- two devices can at worst re-show a hint once; no destructive race.

begin;

alter table public.profiles
  add column ui_flags jsonb not null default '{}'::jsonb;

comment on column public.profiles.ui_flags is
  'Per-user UI latches (one-way false->true), keyed by screen: a6_play_hint_learned, a6_visited. A jsonb bag so new latches do not need migrations.';

commit;
