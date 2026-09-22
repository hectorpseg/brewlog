import "server-only";
import { createClient } from "@/lib/supabase/server";

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

// Compare selector options: label fields only, no observations/sessions payload.
export async function listBrewOptions() {
  const db = await createClient();
  const { data, error } = await db
    .from("brews")
    .select("id, dose_g, water_g, brewed_at, created_at, coffees(name)")
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
  const { data, error } = await db
    .from("experiments")
    .select("*")
    .eq("brew_id", brewId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getExperiment(id: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("experiments")
    .select("*, brews(id, dose_g, water_g, coffee_id, coffees(name))")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
