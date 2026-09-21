-- BrewLog: explicit preparation date. created_at stays the system/audit
-- timestamp; brewed_at is the user-facing date (a brew can be copied before
-- it is prepared). Existing rows inherit created_at — a safe value that
-- predates this column and never destroys data.

alter table public.brews add column if not exists brewed_at timestamptz;

update public.brews set brewed_at = created_at where brewed_at is null;

alter table public.brews alter column brewed_at set not null;
alter table public.brews alter column brewed_at set default now();
