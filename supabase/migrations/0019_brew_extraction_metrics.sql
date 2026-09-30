-- BrewLog: brew extraction metrics (additive only).
-- Two nullable facts on the brews row, following the 0017 water/technique
-- pattern: numeric facts ride the brew, never new entities. Existing brews
-- read NULL; nothing is backfilled or rewritten.

-- tds_percent: measured TDS on the final served beverage, including bypass.
alter table public.brews add column if not exists tds_percent numeric
  check (tds_percent >= 0 and tds_percent <= 30);

-- bypass_g: additional water that did NOT contact the coffee bed, on top of
-- the pours/water that did. Excluded from pour totals; measured beverage is
-- assumed to include it when deriving retained mass.
alter table public.brews add column if not exists bypass_g numeric
  check (bypass_g >= 0 and bypass_g <= 2000);
