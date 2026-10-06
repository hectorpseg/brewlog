-- Inventory conservation for advisory remaining-weight accounting.
-- Recording a brew/cupping against known stock stores exactly how many grams
-- that row actually deducted (clamped at the bag's real content at record
-- time). Deleting the row later hands back precisely that amount — never
-- inventing stock that was never there (e.g. a dose recorded against an
-- already-empty bag). NULL = unknown (legacy rows, or unknown stock at record
-- time): deletion then restores nothing, per "never invent historical data".
alter table public.brews
  add column if not exists inventory_deducted_g numeric;
alter table public.cuppings
  add column if not exists inventory_deducted_g numeric;
