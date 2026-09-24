-- BrewLog coffee metadata: optional origin detail kept as plain fields on
-- coffees (never separate entities). Additive only: all columns nullable,
-- existing rows stay valid, nothing becomes required.
alter table public.coffees
  add column if not exists variety text,
  add column if not exists producer text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists farm text,
  add column if not exists altitude text;
