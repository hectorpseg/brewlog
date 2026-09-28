-- BrewLog S1: favorites, expected text, recent views, brew scores.
-- Additive only: adds columns/tables consumed by later Experience Goals slices.
-- No existing rows are modified beyond column defaults. Existing brews read
-- is_favorite=false and expected_text=NULL; brews without tastings simply have
-- no row in brew_scores (callers treat absence as "No score available").

-- 1. Brew favorites (brews only). Toggle + filter live here, never a new entity.
alter table public.brews add column if not exists is_favorite boolean not null default false;

-- Favorite-filter predicate: own brews flagged favorite, newest first via brewed_at.
create index if not exists idx_brews_favorites
on public.brews (user_id) where is_favorite = true;

-- 2. Expected from this brew: nullable free text, blank for existing rows.
-- Copy-as-next-brew must NOT carry it (same reset category as notes/tastings).
alter table public.brews add column if not exists expected_text text;

-- 3. Recently viewed log: backend-backed, intentionally small (callers cap N).
-- One row per (user, entity); revisiting a page upserts viewed_at.
create table if not exists public.recent_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  entity_type text not null check (entity_type in ('brew', 'coffee', 'session')),
  entity_id uuid not null,
  viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, entity_type, entity_id)
);

alter table public.recent_views enable row level security;

drop policy if exists "own all" on public.recent_views;
create policy "own all" on public.recent_views
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_recent_views_user_viewed
on public.recent_views (user_id, viewed_at desc);

-- 4. Derived brew scores: one row per brew with at least one tasting entry.
-- Read-only aggregation over tastings; the score is never stored, so tasting
-- writes need no invalidation. final_score = avg(value) / 2 (locked Q1).
create or replace view public.brew_scores as
select
  t.brew_id,
  count(*)::integer as entry_count,
  avg(t.value)::numeric as avg_value,
  (avg(t.value) / 2)::numeric as final_score
from public.tastings t
group by t.brew_id;

-- RLS flows through to the underlying tastings rows (Postgres 15+).
alter view public.brew_scores set (security_invoker = true);
