-- BrewLog: pulse speed must be positive (correction to 0022).
-- NULL stays allowed for backward compatibility; only non-NULL values must be > 0.

alter table public.pours
  drop constraint if exists pours_pulse_min_check,
  drop constraint if exists pours_pulse_max_check;

alter table public.pours
  add constraint pours_pulse_min_positive check (pulse_min is null or (pulse_min > 0 and pulse_min <= 1000)),
  add constraint pours_pulse_max_positive check (pulse_max is null or (pulse_max > 0 and pulse_max <= 1000));
