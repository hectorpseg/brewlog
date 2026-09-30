-- BrewLog: remove the Competition target feature.
-- The competition_settings table and its RLS policy are dropped. This is the
-- one intentionally destructive step of the removal, ordered after all code
-- references were gone. Brewing data is untouched; final_beverage_g and the
-- extraction metrics stay as-is.

drop table if exists public.competition_settings;
