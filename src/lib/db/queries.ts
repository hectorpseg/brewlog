import "server-only";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/lists/params";

// ponytail: one helper per entity, RLS does authz, never accept client user_id
export async function listCoffees() {
  const db = await createClient();
  const { data, error } = await db.from("coffees").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getCoffee(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("coffees").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listBrews(coffeeId?: string) {
  const db = await createClient();
  // ponytail: history sorts by preparation date, not system timestamp.
  // One query with joins — never one request per card.
  let q = db
    .from("brews")
    .select("*, observations(*), sessions(title), coffees(name)")
    .order("brewed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (coffeeId) q = q.eq("coffee_id", coffeeId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function getBrew(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("brews").select("*, observations(*), sessions(id, title), coffees(id, name)").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

// ponytail: selector-only projections — dropdowns and id resolution fetch
// scalars, never full rows with observation joins.

// Latest brew ids in compare order, for default/fallback resolution without
// loading the 50-row selector dataset.
export async function listBrewIds(): Promise<string[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("brews")
    .select("id")
    .order("brewed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b: { id: string }) => b.id);
}

// Compare selector options: label fields only, no observations payload.
export async function listBrewOptions() {
  const db = await createClient();
  const { data, error } = await db
    .from("brews")
    .select("id, dose_g, water_g, brewed_at, created_at, coffees(name), sessions(title)")
    .order("brewed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data;
}

// "Add an existing brew" candidates: label + filter fields only.
export async function listBrewCandidates() {
  const db = await createClient();
  const { data, error } = await db
    .from("brews")
    .select("id, dose_g, water_g, temp_c, grind_clicks, session_id, brewed_at, created_at")
    .order("brewed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data;
}

// Session dropdown options (brew form, brew detail): id + title only.
export async function listSessionOptions() {
  const db = await createClient();
  const { data, error } = await db
    .from("sessions")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data;
}

export async function latestBrewForCoffee(coffeeId: string) {
  const db = await createClient();
  const { data } = await db.from("brews").select("*").eq("coffee_id", coffeeId).order("brewed_at", { ascending: false }).order("created_at", { ascending: false }).limit(1).single();
  return data ?? null;
}

// Most recent brew overall, for +Brew continuity (last-used coffee, copy source).
export async function latestBrew() {
  const db = await createClient();
  const { data } = await db
    .from("brews")
    .select("id, coffee_id, dose_g, water_g, created_at, coffees(name)")
    .order("brewed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

export async function getSession(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("sessions").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSessionBrews(sessionId: string) {
  const db = await createClient();
  const { data, error } = await db.from("brews").select("*, observations(*), coffees(name)").eq("session_id", sessionId).order("brewed_at", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Competition target for the current user, or null when never configured.
// Callers fall back to DEFAULT_MIN_BEVERAGE_G — the default lives in code,
// not in the database, because absence of a row must also work (fresh users).
export async function getCompetitionSettings() {
  const db = await createClient();
  const { data, error } = await db.from("competition_settings").select("*").limit(1).single();
  if (error) return null;
  return data;
}

// Structured tasting entries for one brew, stage then attribute order.
// Detail page only — history/compare lists never carry this payload.
export async function listTastings(brewId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("tastings")
    .select("id, brew_id, stage, attribute, value, updated_at")
    .eq("brew_id", brewId)
    .order("stage")
    .order("attribute");
  if (error) throw new Error(error.message);
  return data;
}

// Structured pours for one brew, sequence order. Detail/compare only -
// history lists never carry this payload, and brews without pours (all
// historical rows) simply return [].
export async function listPours(brewId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("pours")
    .select("id, brew_id, sequence, amount_g, timing_seconds, bloom, pattern, note, updated_at")
    .eq("brew_id", brewId)
    .order("sequence");
  if (error) throw new Error(error.message);
  return data;
}

export async function listCuppings(coffeeId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("cuppings")
    .select("*")
    .eq("coffee_id", coffeeId)
    .order("cupped_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// --- Server-side list pages --------------------------------------------------
// ponytail: every list reads one flat *_list view (see 0014_list_views.sql):
// search is a single ILIKE on search_blob (one predicate, no or()-over-join
// quoting pitfalls), filters are plain eq/is, sorts are order(), pages are
// range(). limit+1 rows are fetched so hasMore needs no count query. The
// browser receives exactly the current page. RLS flows through the views via
// security_invoker; queries.ts never accepts a client user_id.

export type ListPage<T> = { rows: T[]; hasMore: boolean };

function pageRange<T>(rows: T[], limit: number): ListPage<T> {
  if (rows.length <= limit) return { rows, hasMore: false };
  return { rows: rows.slice(0, limit), hasMore: true };
}

// search_blob never leaves the server: strip it before rows reach components.
function withoutBlob(r: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...r };
  delete copy.search_blob;
  return copy;
}

export type BrewsPageOpts = {
  coffeeId: string;
  session: string;
  q: string;
  sort: "newest" | "oldest";
  limit: number;
  offset: number;
};

// Brews index page: newest/oldest, coffee + session filters, blob search.
// Observations ride a second batched query (one round trip for the page, no
// per-card requests) so lifecycle status renders exactly as before.
export async function listBrewsPage(opts: BrewsPageOpts): Promise<ListPage<Record<string, unknown>>> {
  const db = await createClient();
  const asc = opts.sort === "oldest";
  let query = db
    .from("brews_list")
    .select("*")
    .order("brewed_at", { ascending: asc })
    .order("created_at", { ascending: asc })
    .range(opts.offset, opts.offset + opts.limit);
  if (opts.coffeeId) query = query.eq("coffee_id", opts.coffeeId);
  if (opts.session === "none") query = query.is("session_id", null);
  else if (opts.session !== "all") query = query.eq("session_id", opts.session);
  if (opts.q) query = query.ilike("search_blob", `%${escapeLike(opts.q)}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const page = pageRange((data ?? []) as Record<string, unknown>[], opts.limit);
  const ids = page.rows.map((r) => r.id as string);
  const obsByBrew = new Map<string, Record<string, unknown>>();
  if (ids.length > 0) {
    const { data: obs } = await db.from("observations").select("*").in("brew_id", ids);
    for (const o of (obs ?? []) as Record<string, unknown>[]) {
      obsByBrew.set(o.brew_id as string, o);
    }
  }
  const rows = page.rows.map((r) => {
    const rest = withoutBlob(r);
    return {
      ...rest,
      session: typeof r.session_title === "string" && r.session_title !== ""
        ? { title: r.session_title as string }
        : null,
      coffees: typeof r.coffee_name === "string" && r.coffee_name !== ""
        ? { name: r.coffee_name as string }
        : null,
      observations: obsByBrew.get(r.id as string) ?? null,
    };
  });
  return { rows, hasMore: page.hasMore };
}

export type CoffeesPageOpts = { q: string; sort: "recent" | "name"; limit: number; offset: number };

export async function listCoffeesPage(opts: CoffeesPageOpts): Promise<ListPage<Record<string, unknown>>> {
  const db = await createClient();
  let query = db.from("coffees_list").select("*");
  query = opts.sort === "name"
    ? query.order("name", { ascending: true }).order("created_at", { ascending: false })
    : query.order("created_at", { ascending: false });
  if (opts.q) query = query.ilike("search_blob", `%${escapeLike(opts.q)}%`);
  query = query.range(opts.offset, opts.offset + opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const page = pageRange((data ?? []) as Record<string, unknown>[], opts.limit);
  return {
    rows: page.rows.map(withoutBlob),
    hasMore: page.hasMore,
  };
}

export type SessionsPageOpts = {
  q: string;
  sort: "recent" | "title";
  has: "all" | "brews" | "empty";
  limit: number;
  offset: number;
};

export async function listSessionsPage(opts: SessionsPageOpts): Promise<ListPage<Record<string, unknown>>> {
  const db = await createClient();
  let query = db.from("sessions_list").select("*");
  query = opts.sort === "title"
    ? query.order("title", { ascending: true }).order("created_at", { ascending: false })
    : query.order("created_at", { ascending: false });
  if (opts.has === "brews") query = query.gt("brew_count", 0);
  else if (opts.has === "empty") query = query.eq("brew_count", 0);
  if (opts.q) query = query.ilike("search_blob", `%${escapeLike(opts.q)}%`);
  query = query.range(opts.offset, opts.offset + opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const page = pageRange((data ?? []) as Record<string, unknown>[], opts.limit);
  return {
    rows: page.rows.map(withoutBlob),
    hasMore: page.hasMore,
  };
}

export type CuppingsPageOpts = { q: string; sort: "newest" | "oldest"; limit: number; offset: number };

export async function listCuppingsPage(opts: CuppingsPageOpts): Promise<ListPage<Record<string, unknown>>> {
  const db = await createClient();
  const asc = opts.sort === "oldest";
  let query = db
    .from("cuppings_list")
    .select("*")
    .order("cupped_at", { ascending: asc })
    .order("created_at", { ascending: asc });
  if (opts.q) query = query.ilike("search_blob", `%${escapeLike(opts.q)}%`);
  query = query.range(opts.offset, opts.offset + opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const page = pageRange((data ?? []) as Record<string, unknown>[], opts.limit);
  return {
    rows: page.rows.map(withoutBlob),
    hasMore: page.hasMore,
  };
}

