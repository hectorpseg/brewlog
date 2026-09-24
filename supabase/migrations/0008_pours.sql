-- BrewLog structured pours: one row per pour in a brew, in deterministic
-- sequence order. Additive only: existing brews have no pour rows and stay
-- completely valid; nothing on brews is altered. Timing is stored numerically
-- as seconds (the UI renders m:ss); patterns are a fixed set, notes stay
-- optional free text.

create table if not exists public.pours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brew_id uuid not null references public.brews(id) on delete cascade,
  sequence integer not null check (sequence >= 1 and sequence <= 20),
  amount_g numeric not null check (amount_g > 0 and amount_g <= 2000),
  timing_seconds integer not null check (timing_seconds >= 0 and timing_seconds <= 3600),
  bloom boolean not null default false,
  pattern text not null check (pattern in ('center', 'circular', 'center+circular', 'continuous', 'pulse', 'custom')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brew_id, sequence)
);

alter table public.pours enable row level security;

drop policy if exists "own all" on public.pours;
create policy "own all" on public.pours
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
