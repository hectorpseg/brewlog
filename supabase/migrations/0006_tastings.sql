-- BrewLog structured tastings: one row per (stage, attribute) fact, rated on a
-- plain 1-10 sensory scale. Additive only: the legacy `observations` table is
-- untouched and stays readable; no text levels are mapped to numbers because
-- that mapping would invent data. Attribute names are free text (the app
-- suggests common ones, never an enum), so custom attributes need no schema
-- change. Widen the value CHECK to evolve the scale later.

create table if not exists public.tastings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brew_id uuid not null references public.brews(id) on delete cascade,
  stage text not null check (stage in ('hot', 'warm', 'cold')),
  attribute text not null check (char_length(attribute) between 1 and 40),
  value numeric not null check (value >= 1 and value <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brew_id, stage, attribute)
);

alter table public.tastings enable row level security;

drop policy if exists "own all" on public.tastings;
create policy "own all" on public.tastings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
