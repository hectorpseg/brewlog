-- BrewLog S2: remove the Experiment concept (intentional destructive cleanup).
-- Narrowly scoped: drops only the experiment tables. No other application
-- table references experiments or experiment_brews (verified: the junction
-- table references experiments(id) ON DELETE CASCADE; brews, sessions,
-- coffees, cuppings, tastings, pours, observations, and the S1 additions
-- are untouched). Application code in this slice no longer reads or writes
-- either table, so this runs with no dependents.
--
-- NOT applied to the hosted database by the coding task: apply deliberately
-- in the Supabase SQL editor after landing the code removal. Expect CI
-- migration-drift to report 0013 pending until then.

drop table if exists public.experiment_brews;
drop table if exists public.experiments;
