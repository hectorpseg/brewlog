-- BrewLog: brew water & technique enrichment (additive only).
-- Water and technique facts ride the brews row as plain fields, never new
-- entities. Existing brews keep their values: water/technique text and ppm
-- default to NULL, and the booleans mirror the is_favorite pattern
-- (NOT NULL DEFAULT false), so old rows read false without a backfill.

-- Beans: this brew's beans were explicitly recorded as selected.
alter table public.brews add column if not exists selected_beans boolean not null default false;

-- Water: brand/name, TDS meter reading, free-text description and notes.
alter table public.brews add column if not exists water_brand text;
alter table public.brews add column if not exists water_ppm numeric;
alter table public.brews add column if not exists water_description text;
alter table public.brews add column if not exists water_notes text;

-- Technique: free-text values for thermal shock and bypass, plus the tool
-- flags for documentation and comparison.
alter table public.brews add column if not exists thermal_shock text;
alter table public.brews add column if not exists bypass text;
alter table public.brews add column if not exists lilydrip boolean not null default false;
alter table public.brews add column if not exists melodrip boolean not null default false;
