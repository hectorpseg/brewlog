-- BrewLog: extend structured pours with technique facts (additive only).
-- Per-pour temperature, MeloDrip flag, and a Switch open/closed state for
-- Hario Switch brews. Existing pour rows read temp_c = NULL, melodrip = false
-- and switch_state = NULL; nothing is rewritten or backfilled. The brew-level
-- Brew temperature (brews.temp_c) and the legacy brews.melodrip column are
-- untouched.

-- Brew-level: Hario Switch technique toggle (same pattern as lilydrip).
alter table public.brews add column if not exists hario_switch boolean not null default false;

-- Pours: actual per-pour temperature (nullable, never backfilled from brews),
-- MeloDrip flag, and the Switch position which may only exist when the brew
-- uses the Hario Switch.
alter table public.pours add column if not exists temp_c numeric;
alter table public.pours add column if not exists melodrip boolean not null default false;
alter table public.pours add column if not exists switch_state text
  check (switch_state is null or switch_state in ('open', 'closed'));
