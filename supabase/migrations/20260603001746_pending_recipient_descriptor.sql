-- Session 8 Step 6: pending_recipient_descriptor for the "Someone else" branch.
--
-- Adds a nullable text column to pending_generations capturing the optional
-- free-form descriptor the user types when they pick "Someone else" at A2
-- (e.g. "Neighbor", "Cousin", "Caregiver"). Sharpens downstream generation
-- by giving Claude a relationship hint when the canonical relationship enum
-- (daughter / son / partner / parent / grandchild / friend / other) is too
-- coarse.
--
-- Optional at the UX layer (does not gate Continue) and at the schema layer
-- (nullable). Populated only when relationship = 'other'; null otherwise.
--
-- Per Step6_A2_Edits_And_A6_Foundation.md A2 spec (descriptor field).

begin;

alter table public.pending_generations
  add column pending_recipient_descriptor text;

comment on column public.pending_generations.pending_recipient_descriptor is
  'Optional free-form descriptor captured at A2 when the user picks "Someone else" as relationship. Sharpens Claude generation by giving a relationship hint beyond the coarse "other" bucket. Nullable; populated only when relationship = ''other''. Not surfaced anywhere outside the generation prompt.';

commit;
