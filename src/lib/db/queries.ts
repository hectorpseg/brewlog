import "server-only";
import { createClient } from "@/lib/supabase/server";
import { EXPERIMENT_BREW_SELECT, EXPERIMENT_DETAIL_SELECT, mergeBrewIdSet } from "@/lib/domain/experiments";

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
  const { data, error } = await db.from("brews").select("*, observations(*), coffees(*), sessions(id, title)").eq("id", id).single();
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

export async function listSessions() {
  const db = await createClient();
  const { data, error } = await db.from("sessions").select("*").order("created_at", { ascending: false }).limit(30);
  if (error) throw new Error(error.message);
  return data;
}

export async function getSession(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("sessions").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSessionBrews(sessionId: string) {
  const db = await createClient();
  const { data, error } = await db.from("brews").select("*, observations(*)").eq("session_id", sessionId).order("brewed_at", { ascending: false }).order("created_at", { ascending: false });
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

export async function listExperimentsForBrew(brewId: string) {
  const db = await createClient();
  // Junction links (Wave 4) plus the legacy single brew_id link, deduped.
  // Two slim queries, never one request per card.
  const [legacy, links] = await Promise.all([
    db.from("experiments").select("*").eq("brew_id", brewId).order("created_at", { ascending: false }),
    db.from("experiment_brews").select("experiment_id").eq("brew_id", brewId),
  ]);
  if (legacy.error) throw new Error(legacy.error.message);
  const legacyRows = legacy.data ?? [];
  const linkIds = [...new Set((links.data ?? []).map((r: { experiment_id: string }) => r.experiment_id))]
    .filter((id) => !legacyRows.some((e: { id: string }) => e.id === id));
  if (linkIds.length === 0) return legacyRows;
  const { data, error } = await db.from("experiments").select("*").in("id", linkIds).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return [...legacyRows, ...(data ?? [])].sort((a: { created_at: string }, b: { created_at: string }) =>
    b.created_at < a.created_at ? -1 : b.created_at > a.created_at ? 1 : 0,
  );
}

// Experiment index: compact rows + linked-brew counts. Counts merge the
// junction table with legacy brew_id links (deduped per experiment).
export async function listExperiments() {
  const db = await createClient();
  const { data, error } = await db
    .from("experiments")
    .select("id, title, hypothesis, status, conclusion, updated_at, brew_id")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const ids = rows.map((r: { id: string }) => r.id);
  let counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: links } = await db.from("experiment_brews").select("experiment_id, brew_id").in("experiment_id", ids);
    counts = new Map<string, number>();
    for (const r of rows as { id: string; brew_id: string | null }[]) {
      const set = new Set<string>();
      for (const l of (links ?? []) as { experiment_id: string; brew_id: string }[]) {
        if (l.experiment_id === r.id) set.add(l.brew_id);
      }
      if (r.brew_id && !set.has(r.brew_id)) set.add(r.brew_id);
      counts.set(r.id, set.size);
    }
  }
  return (rows as { id: string }[]).map((r) => ({ ...r, brewCount: counts.get(r.id) ?? 0 }));
}

// Linked-brew counts for a set of experiments, one query. Merges junction
// rows with legacy brew_id links, deduped per experiment.
export async function countExperimentBrews(ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const db = await createClient();
  const [exps, links] = await Promise.all([
    db.from("experiments").select("id, brew_id").in("id", ids),
    db.from("experiment_brews").select("experiment_id, brew_id").in("experiment_id", ids),
  ]);
  for (const id of ids) {
    const set = new Set<string>();
    for (const l of ((links.data ?? []) as { experiment_id: string; brew_id: string }[])) {
      if (l.experiment_id === id) set.add(l.brew_id);
    }
    const legacy = ((exps.data ?? []) as { id: string; brew_id: string | null }[]).find((e) => e.id === id);
    if (legacy?.brew_id && !set.has(legacy.brew_id)) set.add(legacy.brew_id);
    counts.set(id, set.size);
  }
  return counts;
}

// Brews linked to one experiment: junction rows first, legacy brew_id merged
// in and deduped. Label fields only, for compact linked-brew rows.
export async function listExperimentBrews(experimentId: string) {
  const db = await createClient();
  const [exp, links] = await Promise.all([
    db.from("experiments").select("brew_id").eq("id", experimentId).single(),
    db.from("experiment_brews").select("brew_id").eq("experiment_id", experimentId),
  ]);
  const linkedIds = ((links.data ?? []) as { brew_id: string }[]).map((l) => l.brew_id);
  const ids = mergeBrewIdSet(linkedIds, (exp.data?.brew_id as string | null) ?? null);
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("brews")
    .select(EXPERIMENT_BREW_SELECT)
    .in("id", ids)
    .order("brewed_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
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

export async function getExperiment(id: string) {
  const db = await createClient();
  // ponytail: the bare `brews` embed is ambiguous since 0009 (PostgREST sees
  // both the legacy experiments.brew_id FK and the many-to-many path through
  // experiment_brews, and answers PGRST201). The hint pins the legacy direct
  // link; junction-linked brews arrive separately via listExperimentBrews and
  // are merged by the caller. Never drop the hint without a backfill-safe
  // replacement: legacy rows with brew_id and no junction row must load.
  const { data, error } = await db
    .from("experiments")
    .select(EXPERIMENT_DETAIL_SELECT)
    .eq("id", id)
    .single();
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

// Cuppings index: every tasting with its coffee, newest first.
export async function listAllCuppings() {
  const db = await createClient();
  const { data, error } = await db
    .from("cuppings")
    .select("*, coffees(id, name)")
    .order("cupped_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
