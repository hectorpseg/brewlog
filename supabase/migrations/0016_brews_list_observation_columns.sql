-- BrewLog: observation columns on brews_list (additive only).
-- The Tasted/Untasted filters predicate on observation content, but the
-- S3/S4/S5 view never exposed the left-joined observation columns, so the
-- or()/is() filters failed to parse against the flat view. Expose them as
-- top-level columns (appended after brew_score: CREATE OR REPLACE cannot
-- reorder existing view columns). No brews column collides with these
-- names. security_invoker is re-set so RLS keeps flowing from the base
-- tables through the view.

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
  sc.final_score as brew_score,
  o.acidity, o.sweetness, o.body, o.clarity, o.bitterness, o.astringency,
  o.intensity, o.balance, o.finish,
  o.hot_notes, o.warm_notes, o.cold_notes, o.freeform_notes
from public.brews b
left join public.coffees c on c.id = b.coffee_id
left join public.sessions s on s.id = b.session_id
left join public.observations o on o.brew_id = b.id
left join public.brew_scores sc on sc.brew_id = b.id;
alter view public.brews_list set (security_invoker = true);
