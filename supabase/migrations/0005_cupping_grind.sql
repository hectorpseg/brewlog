-- BrewLog cupping grind: reproducible preparation needs grinder + clicks,
-- not just free text. Additive only: legacy `grind` text stays readable,
-- existing rows remain valid, nothing becomes required.
alter table public.cuppings
  add column if not exists grinder text,
  add column if not exists grind_clicks integer;
