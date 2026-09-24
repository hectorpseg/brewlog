-- BrewLog Wave 4 follow-up: backfill experiment_brews from legacy links.
-- 0009 is already applied and stays untouched. This migration only INSERTs
-- junction rows for explicit pre-existing experiments.brew_id relationships;
-- it never modifies, nulls, or deletes rows in experiments or brews.
-- Ownership is preserved (brew must belong to the experiment owner), orphaned
-- or cross-user brew_id references are skipped, and ON CONFLICT DO NOTHING
-- keeps it safe to run exactly once through Supabase migration tracking
-- (re-runnable without creating duplicates).

insert into public.experiment_brews (experiment_id, brew_id, user_id)
select e.id, e.brew_id, e.user_id
from public.experiments e
where e.brew_id is not null
  and exists (
    select 1
    from public.brews b
    where b.id = e.brew_id
      and b.user_id = e.user_id
  )
on conflict (experiment_id, brew_id) do nothing;
