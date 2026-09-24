-- BrewLog Wave 4: experiments become lightweight multi-brew groups.
-- Additive only: no existing column or row is altered or removed.
-- Legacy single-link columns (brew_id, session_id, changed_variables,
-- expected_result, actual_result, next_question) stay readable so historical
-- experiments keep working. New code links brews through experiment_brews;
-- `variables` reuses the existing changed_variables column (same meaning,
-- new UI label), so no duplicate column is introduced.

alter table public.experiments add column if not exists title text;
alter table public.experiments add column if not exists notes text;
alter table public.experiments
  add column if not exists status text not null default 'planned';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'experiments_status_check'
  ) then
    alter table public.experiments
      add constraint experiments_status_check
      check (status in ('planned', 'in_progress', 'evaluated'));
  end if;
end
$$;

-- Explicit many-to-many link: one experiment groups many brews.
-- Brew rows are never modified by linking; unlinking deletes only this row.
create table if not exists public.experiment_brews (
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  brew_id uuid not null references public.brews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (experiment_id, brew_id)
);

create index if not exists experiment_brews_experiment_idx
  on public.experiment_brews (experiment_id);
create index if not exists experiment_brews_brew_idx
  on public.experiment_brews (brew_id);

alter table public.experiment_brews enable row level security;

drop policy if exists "own all" on public.experiment_brews;
create policy "own all" on public.experiment_brews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
