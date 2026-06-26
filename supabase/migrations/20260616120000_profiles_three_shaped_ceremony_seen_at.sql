-- C1 (Three Shaped) durable once-per-lifetime flag (FOLLOW_UPS #54).
--
-- The C1 ceremony fires "once per user lifetime" after the 3rd save. V1 used a
-- per-device localStorage latch ("step6.three_shaped_seen"), which is
-- per-device, not per-lifetime — a cleared store or a second device replays the
-- moment. This column makes the latch durable and cross-device: the A7 saved
-- page reads it server-side to decide the C1 branch and stamps it on first show.
--
-- A timestamptz (not a boolean) so we keep *when* the moment happened — useful
-- for funnel/retention analysis later; NULL means "not yet seen". A dedicated
-- column rather than profiles.ui_flags because this is a lifetime milestone
-- timestamp, not a UI hint latch. Additive + nullable → low-risk, safe to apply
-- against live data (existing rows default to NULL = "not yet seen").

begin;

alter table public.profiles
  add column three_shaped_ceremony_seen_at timestamptz;

comment on column public.profiles.three_shaped_ceremony_seen_at is
  'When the C1 Three Shaped ceremony was first shown to this user (once per lifetime). NULL = not yet seen. Stamped server-side on first C1 render; replaces the V1 per-device localStorage latch (FOLLOW_UPS #54).';

commit;
