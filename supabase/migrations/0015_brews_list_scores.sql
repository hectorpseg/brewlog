-- BrewLog S4: score columns on brews_list (additive only).
-- Best Rated sorts server-side by joining the S1 brew_scores view into the
-- S3 brews_list view: one flat row per brew, no N+1, no tasting fetch.
-- Brews without tastings have NULL score columns and sort last (nulls last)
-- with the existing brewed_at/created_at order as the deterministic
-- tie-break. Full view body is repeated because CREATE OR REPLACE needs it;
-- the S3 search_blob and joins are unchanged. security_invoker is re-set so
-- RLS keeps flowing from the base tables through both views.

-- NOTE: the score columns append AFTER search_blob because Postgres
-- CREATE OR REPLACE VIEW cannot reorder or rename existing view columns.

create or replace view public.brews_list as
select
  b.*,
  c.name as coffee_name,
  s.title as session_title,
  concat_ws(' ',
    c.name, s.title,
    b.dose_g::text, b.water_g::text, b.temp_c::text, b.grind_clicks::text,
    b.grinder, b.dripper, b.filter, b.water_source,
    b.notes,
    o.acidity, o.sweetness, o.body, o.clarity, o.bitterness, o.astringency,
    o.intensity, o.balance, o.finish,
    o.hot_notes, o.warm_notes, o.cold_notes, o.freeform_notes,
    to_char(b.brewed_at, 'YYYY-MM-DD'), to_char(b.created_at, 'YYYY-MM-DD')
  ) as search_blob,
  sc.entry_count as score_entries,
  sc.avg_value as score_avg,
  sc.final_score as brew_score
from public.brews b
left join public.coffees c on c.id = b.coffee_id
left join public.sessions s on s.id = b.session_id
left join public.observations o on o.brew_id = b.id
left join public.brew_scores sc on sc.brew_id = b.id;
alter view public.brews_list set (security_invoker = true);
