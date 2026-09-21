-- BrewLog V0 schema. All user tables RLS-guarded on user_id.
-- Run in Supabase SQL editor. Requires pgcrypto (gen_random_uuid) — enabled by default.

create table if not exists public.coffees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  origin text,
  process text,
  roast_date text,
  received_date text,
  initial_weight_g numeric,
  remaining_weight_g numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  coffee_id uuid not null references public.coffees(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  dose_g numeric not null,
  water_g numeric not null,
  temp_c numeric,
  grind_clicks integer,
  grinder text,
  dripper text,
  filter text,
  water_source text,
  pour_count integer,
  total_time_sec integer,
  final_beverage_g numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brew_id uuid not null references public.brews(id) on delete cascade,
  acidity text, sweetness text, body text, clarity text,
  bitterness text, astringency text, intensity text, balance text, finish text,
  hot_notes text, warm_notes text, cold_notes text, freeform_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brew_id)
);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brew_id uuid references public.brews(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  hypothesis text, changed_variables text, expected_result text,
  actual_result text, conclusion text, next_question text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coffees enable row level security;
alter table public.sessions enable row level security;
alter table public.brews enable row level security;
alter table public.observations enable row level security;
alter table public.experiments enable row level security;

drop policy if exists "own all" on public.coffees;
create policy "own all" on public.coffees for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own all" on public.sessions;
create policy "own all" on public.sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own all" on public.brews;
create policy "own all" on public.brews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own all" on public.observations;
create policy "own all" on public.observations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own all" on public.experiments;
create policy "own all" on public.experiments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
