-- Auto-create a public.profiles row whenever a new auth.users row is inserted.
--
-- Motivation: several app tables (usage_events, training_clips, voice_profiles,
-- etc.) FK to public.profiles(user_id), but historically profile creation was
-- on-demand via getOrCreateProfile() which only ran when a page touched it
-- (e.g. /home). A fresh user hitting any write API before that — e.g. POST
-- /api/audio/init-upload — would trip FK violations on usage_events.user_id
-- and on training_clips.user_id. This trigger closes that race.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any existing auth.users without a profiles row (e.g. users that
-- signed up before this trigger existed) get one now. Idempotent.
insert into public.profiles (user_id)
select u.id
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;
