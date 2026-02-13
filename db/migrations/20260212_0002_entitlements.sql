begin;

-- Plan tiers for early pricing tests (no billing integration yet)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type plan_tier as enum ('vault', 'legacy', 'guardian');
  end if;
end $$;

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan plan_tier not null default 'vault',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements enable row level security;

-- User can read their own plan
create policy "user_entitlements_select_own"
on public.user_entitlements
for select
using (auth.uid() = user_id);

-- No insert/update/delete policies for authenticated users.
-- Service role will manage these rows server-side (or you can set manually in SQL editor).

commit;
