-- BrewLog: minimal cupping workflow. A cupping is a dated tasting of a coffee,
-- distinct from a Brew (no recipe execution, no equipment entities).
-- Sensory lives on the row as hot/warm/cold notes + free notes.

create table if not exists public.cuppings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  coffee_id uuid not null references public.coffees(id) on delete cascade,
  cupped_at timestamptz not null default now(),
  dose_g numeric,
  water_g numeric,
  grind text,
  notes text,
  hot_notes text,
  warm_notes text,
  cold_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cuppings enable row level security;

drop policy if exists "own all" on public.cuppings;
create policy "own all" on public.cuppings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
