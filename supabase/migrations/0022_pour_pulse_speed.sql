-- BrewLog: per-pour pulse speed (additive only).
-- Stored as min/max so a single value, a decimal, or a range can all be
-- represented without inventing data. Existing pours read NULL for both.

alter table public.pours
  add column if not exists pulse_min numeric check (pulse_min >= 0 and pulse_min <= 1000),
  add column if not exists pulse_max numeric check (pulse_max >= 0 and pulse_max <= 1000);
