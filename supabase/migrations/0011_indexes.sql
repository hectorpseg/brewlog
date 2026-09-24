-- BrewLog performance indexes (additive only, DO NOT drop or rename existing indexes).
-- These support real existing query predicates; applying them will reduce
-- sequential table scans for the listed queries.

-- 1. listBrews(coffeeId)  and  latestBrewForCoffee(coffeeId)
create index if not exists idx_brews_coffee_id
on public.brews (coffee_id);

-- 2. listSessionBrews(sessionId)
create index if not exists idx_brews_session_id
on public.brews (session_id);

-- 3. listTastings(brewId)
create index if not exists idx_tastings_brew_id
on public.tastings (brew_id);

-- 4. listPours(brewId)
create index if not exists idx_pours_brew_id
on public.pours (brew_id);

-- 5. listExperimentBrews(experimentId)  and  countExperimentBrews
create index if not exists idx_experiment_brews_experiment_id
on public.experiment_brews (experiment_id);
