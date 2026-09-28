-- BrewLog S3: server-side list views (additive only).
-- One flat row per record so list search/filter/sort/pagination run in a
-- single query: no N+1, no client prefetch, no PostgREST or()-over-joins.
-- security_invoker keeps the caller's RLS on the base tables (same pattern
-- as the S1 brew_scores view). search_blob is the single ILIKE target: one
-- predicate per list, so values containing commas/quotes need no special
-- quoting. Boundary matches across concatenated fields may widen results
-- slightly; they never drop a genuine match.

-- Brews: recipe + coffee/session labels + observation text + dates.
-- Parity with the retired client matcher (coffee, session, dates, notes,
-- observation text) plus naturally-remembered recipe facts (dose, water,
-- temp, clicks, grinder, dripper, filter, water source).
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
  ) as search_blob
from public.brews b
left join public.coffees c on c.id = b.coffee_id
left join public.sessions s on s.id = b.session_id
left join public.observations o on o.brew_id = b.id;
alter view public.brews_list set (security_invoker = true);

-- Coffees: every metadata text field the retired client matcher covered.
create or replace view public.coffees_list as
select
  c.*,
  concat_ws(' ',
    c.name, c.origin, c.process, c.variety, c.producer, c.country,
    c.region, c.farm, c.altitude, c.notes
  ) as search_blob
from public.coffees c;
alter view public.coffees_list set (security_invoker = true);

-- Sessions: title/notes plus brew_count (powers the empty/non-empty filter
-- and the row suffix; correlated subquery is fine at this scale and stays
-- RLS-transparent under the invoker).
create or replace view public.sessions_list as
select
  s.*,
  (select count(*)::integer from public.brews b where b.session_id = s.id) as brew_count,
  concat_ws(' ', s.title, s.notes) as search_blob
from public.sessions s;
alter view public.sessions_list set (security_invoker = true);

-- Cuppings: own fields plus the parent coffee name (parity with the retired
-- client matcher, which searched coffee + dates + grinder + clicks + notes).
create or replace view public.cuppings_list as
select
  cu.*,
  c.name as coffee_name,
  concat_ws(' ',
    c.name, cu.grind, cu.grinder, cu.grind_clicks::text,
    cu.dose_g::text, cu.water_g::text,
    cu.notes, cu.hot_notes, cu.warm_notes, cu.cold_notes,
    to_char(cu.cupped_at, 'YYYY-MM-DD'), to_char(cu.created_at, 'YYYY-MM-DD')
  ) as search_blob
from public.cuppings cu
left join public.coffees c on c.id = cu.coffee_id;
alter view public.cuppings_list set (security_invoker = true);
