-- BrewLog V0: configurable competition target. One row per user (upsert on
-- user_id). Application falls back to 150 g when no row exists; the value is a
-- default for the current competition, never a universal rule.

create table if not exists public.competition_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null default 'Current competition',
  min_final_beverage_g numeric not null default 150,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.competition_settings enable row level security;

drop policy if exists "own all" on public.competition_settings;
create policy "own all" on public.competition_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
