"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { coffeeSchema, newBrewFormSchema, observationSchema, experimentSchema, sessionSchema, competitionSettingsSchema, cuppingSchema, tastingsPayloadSchema, poursPayloadSchema, DEFAULT_MIN_BEVERAGE_G } from "@/lib/validation/schemas";
import { toBrewedAtIso } from "@/lib/domain/brew-date";
import { safeNext } from "@/lib/auth";

// ponytail: thin zod-then-insert actions; RLS enforces ownership, user_id never from client

export async function login(formData: FormData): Promise<void> {
  const db = await createClient();
  const next = safeNext(String(formData.get("next") ?? ""));
  const { error } = await db.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function logout() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}

function nullish(v: FormDataEntryValue | null) {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? undefined : s;
}

export async function createCoffee(formData: FormData): Promise<void> {
  const parsed = coffeeSchema.safeParse({
    name: nullish(formData.get("name")),
    origin: nullish(formData.get("origin")),
    process: nullish(formData.get("process")),
    variety: nullish(formData.get("variety")),
    producer: nullish(formData.get("producer")),
    country: nullish(formData.get("country")),
    region: nullish(formData.get("region")),
    farm: nullish(formData.get("farm")),
    altitude: nullish(formData.get("altitude")),
    roastDate: nullish(formData.get("roastDate")),
    receivedDate: nullish(formData.get("receivedDate")),
    initialWeightG: nullish(formData.get("initialWeightG")),
    remainingWeightG: nullish(formData.get("remainingWeightG")) ?? nullish(formData.get("initialWeightG")),
    notes: nullish(formData.get("notes")),
  });
  if (!parsed.success) redirect(`/coffees/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid coffee")}`);
  const d = parsed.data;
  const db = await createClient();
  const { data, error } = await db.from("coffees").insert({
    name: d.name, origin: d.origin, process: d.process,
    variety: d.variety, producer: d.producer, country: d.country,
    region: d.region, farm: d.farm, altitude: d.altitude,
    roast_date: d.roastDate, received_date: d.receivedDate,
    initial_weight_g: d.initialWeightG, remaining_weight_g: d.remainingWeightG,
    notes: d.notes,
  }).select("id").single();
  if (error) redirect(`/coffees/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/coffees");
  redirect(`/coffees/${data.id}`);
}

export async function updateCoffee(id: string, formData: FormData): Promise<void> {
  const parsed = coffeeSchema.safeParse({
    name: nullish(formData.get("name")),
    origin: nullish(formData.get("origin")),
    process: nullish(formData.get("process")),
    variety: nullish(formData.get("variety")),
    producer: nullish(formData.get("producer")),
    country: nullish(formData.get("country")),
    region: nullish(formData.get("region")),
    farm: nullish(formData.get("farm")),
    altitude: nullish(formData.get("altitude")),
    roastDate: nullish(formData.get("roastDate")),
    receivedDate: nullish(formData.get("receivedDate")),
    initialWeightG: nullish(formData.get("initialWeightG")),
    remainingWeightG: nullish(formData.get("remainingWeightG")),
    notes: nullish(formData.get("notes")),
  });
  if (!parsed.success) return;
  const d = parsed.data;
  const db = await createClient();
  const { error } = await db.from("coffees").update({
    name: d.name, origin: d.origin, process: d.process,
    variety: d.variety, producer: d.producer, country: d.country,
    region: d.region, farm: d.farm, altitude: d.altitude,
    roast_date: d.roastDate, received_date: d.receivedDate,
    initial_weight_g: d.initialWeightG, remaining_weight_g: d.remainingWeightG,
    notes: d.notes, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return;
  revalidatePath("/coffees");
  redirect("/coffees");
}

export async function createBrew(prev: unknown, formData: FormData): Promise<{ error?: string; id?: string }> {
  const parsed = newBrewFormSchema.safeParse({
    coffeeId: nullish(formData.get("coffeeId")),
    sessionId: nullish(formData.get("sessionId")),
    doseG: nullish(formData.get("doseG")),
    waterG: nullish(formData.get("waterG")),
    brewedAt: nullish(formData.get("brewedAt")),
    tempC: nullish(formData.get("tempC")),
    grindClicks: nullish(formData.get("grindClicks")),
    grinder: nullish(formData.get("grinder")),
    dripper: nullish(formData.get("dripper")),
    filter: nullish(formData.get("filter")),
    waterSource: nullish(formData.get("waterSource")),
    pourCount: nullish(formData.get("pourCount")),
    brewTimeMin: nullish(formData.get("brewTimeMin")),
    brewTimeSec: nullish(formData.get("brewTimeSec")),
    finalBeverageG: nullish(formData.get("finalBeverageG")),
    notes: nullish(formData.get("notes")),
    tastings: nullish(formData.get("tastings")),
    pours: nullish(formData.get("pours")),
    hotNotes: nullish(formData.get("hotNotes")),
    warmNotes: nullish(formData.get("warmNotes")),
    coldNotes: nullish(formData.get("coldNotes")),
    freeformNotes: nullish(formData.get("freeformNotes")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid brew" };
  const d = parsed.data;
  const { toSeconds } = await import("@/lib/domain/brew-time");
  const { toBrewedAtIso } = await import("@/lib/domain/brew-date");
  const { completePourEntries, pourRowsFromJson } = await import("@/lib/domain/pours");
  // the manual pour count is gone: structured pours are the counter. A legacy
  // inherited count survives only when no structured pours were entered.
  const createPourEntries = completePourEntries(pourRowsFromJson(d.pours));
  const db = await createClient();
  const { data, error } = await db.from("brews").insert({
    coffee_id: d.coffeeId, session_id: d.sessionId, dose_g: d.doseG, water_g: d.waterG, temp_c: d.tempC,
    brewed_at: toBrewedAtIso(d.brewedAt) ?? new Date().toISOString(),
    grind_clicks: d.grindClicks, grinder: d.grinder, dripper: d.dripper,
    filter: d.filter, water_source: d.waterSource,
    pour_count: createPourEntries.length > 0 ? createPourEntries.length : d.pourCount,
    total_time_sec: toSeconds(
      d.brewTimeMin == null ? undefined : Number(d.brewTimeMin),
      d.brewTimeSec == null ? undefined : Number(d.brewTimeSec),
    ),
    final_beverage_g: d.finalBeverageG, notes: d.notes,
  }).select("id").single();
  if (error) return { error: error.message };
  // child rows ride along at creation: observation, structured tasting, and
  // structured pours are independent of each other, so they persist in
  // parallel rather than sequentially. Only complete entries persist.
  const { completeTastingEntries, tastingRowsFromJson } = await import("@/lib/domain/tastings");
  const tastingEntries = completeTastingEntries(tastingRowsFromJson(d.tastings));
  const pourEntries = createPourEntries;
  const childWrites: Promise<{ error?: string }>[] = [];
  // first tasting notes ride along at creation as the brew's observation row
  if (d.hotNotes || d.warmNotes || d.coldNotes || d.freeformNotes) {
    childWrites.push((async () => {
      const obs = observationSchema.safeParse({
        brewId: data.id, hotNotes: d.hotNotes, warmNotes: d.warmNotes,
        coldNotes: d.coldNotes, freeformNotes: d.freeformNotes,
      });
      if (!obs.success) return { error: "Brew saved, but notes were invalid." };
      const o = obs.data;
      const { error: obsError } = await db.from("observations").insert({
        brew_id: o.brewId, hot_notes: o.hotNotes, warm_notes: o.warmNotes,
        cold_notes: o.coldNotes, freeform_notes: o.freeformNotes,
      });
      if (obsError) return { error: "Brew saved, but notes failed to save." };
      return {};
    })());
  }
  if (tastingEntries.length > 0) {
    childWrites.push((async () => {
      const { error: tasteError } = await db.from("tastings").insert(
        tastingEntries.map((e) => ({ brew_id: data.id, stage: e.stage, attribute: e.attribute, value: e.value })),
      );
      if (tasteError) return { error: "Brew saved, but tasting failed to save." };
      return {};
    })());
  }
  if (pourEntries.length > 0) {
    childWrites.push((async () => {
      const { error: pourError } = await db.from("pours").insert(
        pourEntries.map((e) => ({
          brew_id: data.id, sequence: e.sequence, amount_g: e.amount_g,
          timing_seconds: e.timing_seconds, bloom: e.bloom, pattern: e.pattern, note: e.note,
        })),
      );
      if (pourError) return { error: "Brew saved, but pours failed to save." };
      return {};
    })());
  }
  for (const res of await Promise.all(childWrites)) {
    if (res.error) return { error: res.error };
  }
  // approximate inventory decrement, advisory only
  const { data: coffee } = await db.from("coffees").select("remaining_weight_g").eq("id", d.coffeeId).single();
  if (coffee?.remaining_weight_g != null) {
    await db.from("coffees").update({
      remaining_weight_g: Math.max(0, Number(coffee.remaining_weight_g) - Number(d.doseG)),
    }).eq("id", d.coffeeId);
  }
  revalidatePath("/brews");
  return { id: data.id };
}

export async function updateBrew(id: string, patch: Record<string, string | undefined>) {
  const { toBrewUpdateRow } = await import("@/lib/db/brew-update");
  const { isFutureDateString } = await import("@/lib/domain/brew-date");
  if (isFutureDateString(patch.brewedAt)) return { error: "Brew date cannot be in the future" };
  const db = await createClient();
  const fields = toBrewUpdateRow(patch);
  if (Object.keys(fields).length === 0) return;
  const { error } = await db.from("brews").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
}

// Move an existing brew into a session, or out (target ""/missing = unassign).
// Never creates a brew — pure reassignment through RLS.
export async function moveBrewToSession(formData: FormData): Promise<void> {
  const { safeNext } = await import("@/lib/auth");
  const brewId = nullish(formData.get("brewId"));
  const target = nullish(formData.get("sessionId"));
  if (!brewId) return;
  const db = await createClient();
  const { error } = await db.from("brews").update({
    session_id: target ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", brewId);
  if (error) return;
  revalidatePath("/sessions");
  revalidatePath("/brews");
  redirect(safeNext(nullish(formData.get("returnTo")) || (target ? `/sessions/${target}` : "/brews")));
}

// Unassign-only variant with serializable args, so delete-style client
// components can `.bind` it like every other action. Delegates to
// moveBrewToSession — no duplicated update logic.
export async function removeBrewFromSession(brewId: string, returnTo: string): Promise<void> {
  const formData = new FormData();
  formData.set("brewId", brewId);
  formData.set("sessionId", "");
  formData.set("returnTo", returnTo);
  return moveBrewToSession(formData);
}

export async function upsertObservation(patch: Record<string, string | undefined> & { brewId: string }) {
  const parsed = observationSchema.safeParse({
    brewId: patch.brewId,
    acidity: patch.acidity || undefined, sweetness: patch.sweetness || undefined,
    body: patch.body || undefined, clarity: patch.clarity || undefined,
    bitterness: patch.bitterness || undefined, astringency: patch.astringency || undefined,
    intensity: patch.intensity || undefined, balance: patch.balance || undefined,
    finish: patch.finish || undefined, hotNotes: patch.hotNotes || undefined,
    warmNotes: patch.warmNotes || undefined, coldNotes: patch.coldNotes || undefined,
    freeformNotes: patch.freeformNotes || undefined,
  });
  if (!parsed.success) return { error: "Invalid observation" };
  const d = parsed.data;
  const db = await createClient();
  const { error } = await db.from("observations").upsert({
    brew_id: d.brewId, acidity: d.acidity, sweetness: d.sweetness, body: d.body,
    clarity: d.clarity, bitterness: d.bitterness, astringency: d.astringency,
    intensity: d.intensity, balance: d.balance, finish: d.finish,
    hot_notes: d.hotNotes, warm_notes: d.warmNotes, cold_notes: d.coldNotes,
    freeform_notes: d.freeformNotes, updated_at: new Date().toISOString(),
  }, { onConflict: "brew_id" });
  if (error) return { error: error.message };
}

// Structured tastings ride the brew editor autosave: the payload is the full
// desired state, so entries removed in the editor are deleted here. Legacy
// observations are untouched — this never reads or writes that table.
export async function upsertTastings(brewId: string, entries: { stage: string; attribute: string; value: number }[]) {
  const parsed = tastingsPayloadSchema.safeParse(entries);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid tasting" };
  const db = await createClient();
  const rows = parsed.data.map((e) => ({
    brew_id: brewId, stage: e.stage, attribute: e.attribute, value: e.value,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length > 0) {
    const { error } = await db.from("tastings").upsert(rows, { onConflict: "brew_id,stage,attribute" });
    if (error) return { error: error.message };
  }
  const keep = new Set(rows.map((r) => `${r.stage}\n${r.attribute}`));
  const { data: existing } = await db.from("tastings").select("id, stage, attribute").eq("brew_id", brewId);
  const dropIds = (existing ?? [])
    .filter((e) => !keep.has(`${e.stage}\n${e.attribute}`))
    .map((e) => e.id);
  if (dropIds.length > 0) {
    const { error } = await db.from("tastings").delete().in("id", dropIds);
    if (error) return { error: error.message };
  }
}

// Structured pours ride the brew editor autosave: the payload is the full
// desired state, so pours removed in the editor are deleted here. The brews
// row is untouched - this never reads or writes that table.
export async function upsertPours(brewId: string, entries: { sequence: number; amount_g: number; timing_seconds: number; bloom: boolean; pattern: string; note?: string | null }[]) {
  const parsed = poursPayloadSchema.safeParse(entries);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid pour" };
  const db = await createClient();
  const rows = parsed.data.map((e) => ({
    brew_id: brewId, sequence: e.sequence, amount_g: e.amount_g,
    timing_seconds: e.timing_seconds, bloom: e.bloom, pattern: e.pattern, note: e.note,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length > 0) {
    const { error } = await db.from("pours").upsert(rows, { onConflict: "brew_id,sequence" });
    if (error) return { error: error.message };
  }
  const keep = new Set(rows.map((r) => r.sequence));
  const { data: existing } = await db.from("pours").select("id, sequence").eq("brew_id", brewId);
  const dropIds = (existing ?? [])
    .filter((e) => !keep.has(e.sequence))
    .map((e) => e.id);
  if (dropIds.length > 0) {
    const { error } = await db.from("pours").delete().in("id", dropIds);
    if (error) return { error: error.message };
  }
}

export async function createExperiment(formData: FormData): Promise<void> {
  const parsed = experimentSchema.safeParse({
    brewId: nullish(formData.get("brewId")),
    sessionId: nullish(formData.get("sessionId")),
    title: nullish(formData.get("title")),
    status: nullish(formData.get("status")),
    hypothesis: nullish(formData.get("hypothesis")),
    changedVariables: nullish(formData.get("changedVariables")),
    expectedResult: nullish(formData.get("expectedResult")),
    actualResult: nullish(formData.get("actualResult")),
    conclusion: nullish(formData.get("conclusion")),
    nextQuestion: nullish(formData.get("nextQuestion")),
    notes: nullish(formData.get("notes")),
  });
  if (!parsed.success) return;
  const d = parsed.data;
  const db = await createClient();
  const { data, error } = await db.from("experiments").insert({
    brew_id: d.brewId, session_id: d.sessionId, title: d.title,
    status: d.status ?? "planned",
    hypothesis: d.hypothesis,
    changed_variables: d.changedVariables, expected_result: d.expectedResult,
    actual_result: d.actualResult, conclusion: d.conclusion, next_question: d.nextQuestion,
    notes: d.notes,
  }).select("id").single();
  if (error || !data) return;
  // Mirror the legacy single link into the junction table so list/detail
  // queries (junction-first) see it without a second code path.
  if (d.brewId) {
    await db.from("experiment_brews").upsert(
      { experiment_id: data.id, brew_id: d.brewId },
      { onConflict: "experiment_id,brew_id" },
    );
  }
  // the form lives on the brew page or the experiments index: return to the
  // explicit returnTo target when given, else to the brew or the new record
  const returnTo = nullish(formData.get("returnTo"));
  revalidatePath("/brews");
  revalidatePath("/experiments");
  if (d.brewId) revalidatePath(`/brews/${d.brewId}`);
  redirect(returnTo || (d.brewId ? `/brews/${d.brewId}` : `/experiments/${data.id}`));
}

export async function updateExperiment(id: string, formData: FormData): Promise<void> {
  const parsed = experimentSchema.safeParse({
    brewId: nullish(formData.get("brewId")),
    sessionId: nullish(formData.get("sessionId")),
    title: nullish(formData.get("title")),
    status: nullish(formData.get("status")),
    hypothesis: nullish(formData.get("hypothesis")),
    changedVariables: nullish(formData.get("changedVariables")),
    expectedResult: nullish(formData.get("expectedResult")),
    actualResult: nullish(formData.get("actualResult")),
    conclusion: nullish(formData.get("conclusion")),
    nextQuestion: nullish(formData.get("nextQuestion")),
    notes: nullish(formData.get("notes")),
  });
  if (!parsed.success) return;
  const d = parsed.data;
  const db = await createClient();
  const patch: Record<string, unknown> = {
    title: d.title,
    hypothesis: d.hypothesis,
    changed_variables: d.changedVariables, expected_result: d.expectedResult,
    actual_result: d.actualResult, conclusion: d.conclusion, next_question: d.nextQuestion,
    notes: d.notes,
    updated_at: new Date().toISOString(),
  };
  // Status is explicit user state: only write it when the form sent one, so
  // legacy forms that predate the field cannot reset it to the default.
  if (d.status) patch.status = d.status;
  // Legacy single link is preserved read-only here: linking now happens
  // through link/unlinkBrewToExperiment (junction table). The column is only
  // written when the form explicitly carries a brew id (brew-page inline form).
  if (d.brewId !== undefined) patch.brew_id = d.brewId;
  if (d.sessionId !== undefined) patch.session_id = d.sessionId;
  const { error } = await db.from("experiments").update(patch).eq("id", id);
  if (error) return;
  if (d.brewId) {
    await db.from("experiment_brews").upsert(
      { experiment_id: id, brew_id: d.brewId },
      { onConflict: "experiment_id,brew_id" },
    );
  }
  revalidatePath("/brews");
  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
  if (d.brewId) revalidatePath(`/brews/${d.brewId}`);
  // the edit form is reached from a brew or the experiment page: return to
  // the explicit target when given
  const returnTo = nullish(formData.get("returnTo"));
  redirect(returnTo || (d.brewId ? `/brews/${d.brewId}` : `/experiments/${id}`));
}

// Explicit linking: add an existing brew to an experiment (junction row only,
// the brew record itself is untouched). Idempotent via upsert.
export async function linkBrewToExperiment(formData: FormData): Promise<void> {
  const experimentId = nullish(formData.get("experimentId"));
  const brewId = nullish(formData.get("brewId"));
  if (!experimentId || !brewId) return;
  const db = await createClient();
  const { error } = await db.from("experiment_brews").upsert(
    { experiment_id: experimentId, brew_id: brewId },
    { onConflict: "experiment_id,brew_id" },
  );
  if (error) return;
  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath(`/brews/${brewId}`);
  redirect(nullish(formData.get("returnTo")) || `/experiments/${experimentId}`);
}

// Explicit unlinking: remove the junction row only, the brew stays in
// history. A matching legacy brew_id link is cleared too so the brew does
// not ghost back through the old column.
export async function unlinkBrewFromExperiment(experimentId: string, brewId: string): Promise<void> {
  const db = await createClient();
  await db.from("experiment_brews").delete().eq("experiment_id", experimentId).eq("brew_id", brewId);
  const { data: exp } = await db.from("experiments").select("brew_id").eq("id", experimentId).single();
  if (exp?.brew_id === brewId) {
    await db.from("experiments").update({ brew_id: null, updated_at: new Date().toISOString() }).eq("id", experimentId);
  }
  revalidatePath(`/experiments/${experimentId}`);
  revalidatePath(`/brews/${brewId}`);
}

export async function createSession(formData: FormData): Promise<void> {
  const parsed = sessionSchema.safeParse({ title: nullish(formData.get("title")), notes: nullish(formData.get("notes")) });
  if (!parsed.success) return;
  const db = await createClient();
  const { data, error } = await db.from("sessions").insert({ title: parsed.data.title, notes: parsed.data.notes }).select("id").single();
  if (error) return;
  revalidatePath("/sessions");
  redirect(`/sessions/${data.id}`);
}

export async function updateSession(id: string, formData: FormData): Promise<void> {
  const parsed = sessionSchema.safeParse({ title: nullish(formData.get("title")), notes: nullish(formData.get("notes")) });
  if (!parsed.success) return;
  const db = await createClient();
  const { error } = await db.from("sessions").update({
    title: parsed.data.title, notes: parsed.data.notes, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return;
  revalidatePath("/sessions");
  redirect(`/sessions/${id}`);
}

export async function updateCompetitionSettings(formData: FormData): Promise<void> {
  const parsed = competitionSettingsSchema.safeParse({
    name: nullish(formData.get("name")),
    minFinalBeverageG: nullish(formData.get("minFinalBeverageG")),
  });
  if (!parsed.success) return;
  const db = await createClient();
  // one row per user; user_id falls back to auth.uid() and RLS enforces ownership
  const { error } = await db.from("competition_settings").upsert({
    name: parsed.data.name ?? "Current competition",
    min_final_beverage_g: parsed.data.minFinalBeverageG ?? DEFAULT_MIN_BEVERAGE_G,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return;
  revalidatePath("/account");
  redirect("/account");
}

// --- Deletion ---------------------------------------------------------------
// ponytail: RLS scopes every delete to the caller — no ownership checks needed
// in code. Consequences follow the schema: observations cascade with their
// brew; coffee delete cascades its brews; session delete keeps brews
// (unassigned); experiment links null out (experiments survive, detached).
// Each confirm UI states this explicitly via describeDeletion().

export async function deleteBrew(id: string): Promise<void> {
  const { restoredAfter } = await import("@/lib/domain/inventory");
  const db = await createClient();
  // read the dose first (RLS-scoped): deleting hands the coffee back
  const { data: brew } = await db.from("brews").select("coffee_id, dose_g").eq("id", id).single();
  const { error } = await db.from("brews").delete().eq("id", id);
  if (error) return;
  if (brew) {
    const { data: coffee } = await db.from("coffees").select("remaining_weight_g").eq("id", brew.coffee_id).single();
    if (coffee?.remaining_weight_g != null) {
      await db.from("coffees").update({
        remaining_weight_g: restoredAfter(Number(coffee.remaining_weight_g), Number(brew.dose_g)),
      }).eq("id", brew.coffee_id);
    }
  }
  revalidatePath("/brews");
  revalidatePath("/coffees");
  revalidatePath("/sessions");
  redirect("/brews");
}

export async function deleteCoffee(id: string): Promise<void> {
  const db = await createClient();
  const { error } = await db.from("coffees").delete().eq("id", id);
  if (error) return;
  revalidatePath("/coffees");
  revalidatePath("/brews");
  redirect("/coffees");
}

export async function deleteSession(id: string): Promise<void> {
  const db = await createClient();
  const { error } = await db.from("sessions").delete().eq("id", id);
  if (error) return;
  revalidatePath("/sessions");
  revalidatePath("/brews");
  redirect("/sessions");
}

export async function deleteExperiment(id: string, brewId: string | null): Promise<void> {
  const db = await createClient();
  const { error } = await db.from("experiments").delete().eq("id", id);
  if (error) return;
  // junction rows cascade with the experiment; linked brews stay in history.
  revalidatePath("/brews");
  revalidatePath("/experiments");
  redirect(brewId ? `/brews/${brewId}` : "/experiments");
}

function cuppedAtIso(dateStr?: string | null): string {
  return toBrewedAtIso(dateStr) ?? new Date().toISOString();
}

export async function createCupping(formData: FormData): Promise<void> {
  const parsed = cuppingSchema.safeParse({
    coffeeId: nullish(formData.get("coffeeId")),
    cuppedAt: nullish(formData.get("cuppedAt")),
    doseG: nullish(formData.get("doseG")),
    waterG: nullish(formData.get("waterG")),
    grind: nullish(formData.get("grind")),
    grinder: nullish(formData.get("grinder")),
    grindClicks: nullish(formData.get("grindClicks")),
    notes: nullish(formData.get("notes")),
    hotNotes: nullish(formData.get("hotNotes")),
    warmNotes: nullish(formData.get("warmNotes")),
    coldNotes: nullish(formData.get("coldNotes")),
  });
  if (!parsed.success) return;
  const d = parsed.data;
  const { remainingAfter } = await import("@/lib/domain/inventory");
  const db = await createClient();
  const { data: inserted, error } = await db.from("cuppings").insert({
    coffee_id: d.coffeeId, cupped_at: cuppedAtIso(d.cuppedAt),
    dose_g: d.doseG, water_g: d.waterG, grind: d.grind,
    grinder: d.grinder, grind_clicks: d.grindClicks, notes: d.notes,
    hot_notes: d.hotNotes, warm_notes: d.warmNotes, cold_notes: d.coldNotes,
  }).select("id").single();
  if (error || !inserted) return;
  // tasting consumes coffee like brewing does: same advisory decrement,
  // clamped at zero, skipped when remaining is unknown.
  if (d.doseG != null) {
    const { data: coffee } = await db.from("coffees").select("remaining_weight_g").eq("id", d.coffeeId).single();
    if (coffee?.remaining_weight_g != null) {
      const { error: invError } = await db.from("coffees").update({
        remaining_weight_g: Math.max(0, remainingAfter(Number(coffee.remaining_weight_g), Number(d.doseG))),
      }).eq("id", d.coffeeId);
      if (invError) {
        // compensate: no cupping without its inventory move
        await db.from("cuppings").delete().eq("id", inserted.id);
        return;
      }
    }
  }
  revalidatePath(`/coffees/${d.coffeeId}`);
  redirect(`/coffees/${d.coffeeId}`);
}

export async function updateCupping(id: string, coffeeId: string, formData: FormData): Promise<void> {
  const parsed = cuppingSchema.safeParse({
    coffeeId,
    cuppedAt: nullish(formData.get("cuppedAt")),
    doseG: nullish(formData.get("doseG")),
    waterG: nullish(formData.get("waterG")),
    grind: nullish(formData.get("grind")),
    grinder: nullish(formData.get("grinder")),
    grindClicks: nullish(formData.get("grindClicks")),
    notes: nullish(formData.get("notes")),
    hotNotes: nullish(formData.get("hotNotes")),
    warmNotes: nullish(formData.get("warmNotes")),
    coldNotes: nullish(formData.get("coldNotes")),
  });
  if (!parsed.success) return;
  const d = parsed.data;
  const { applyInventoryDelta, cuppingDoseDelta } = await import("@/lib/domain/inventory");
  const db = await createClient();
  // read the old dose first (RLS-scoped): inventory moves by the delta only
  const { data: current } = await db.from("cuppings").select("dose_g").eq("id", id).single();
  if (!current) return;
  const delta = cuppingDoseDelta(current.dose_g, d.doseG);
  if (delta !== 0) {
    const { data: coffee } = await db.from("coffees").select("remaining_weight_g").eq("id", d.coffeeId).single();
    if (coffee?.remaining_weight_g != null) {
      const { error: invError } = await db.from("coffees").update({
        remaining_weight_g: applyInventoryDelta(Number(coffee.remaining_weight_g), delta),
      }).eq("id", d.coffeeId);
      if (invError) return;
    }
  }
  const { error } = await db.from("cuppings").update({
    cupped_at: d.cuppedAt ? cuppedAtIso(d.cuppedAt) : undefined,
    dose_g: d.doseG, water_g: d.waterG, grind: d.grind,
    grinder: d.grinder, grind_clicks: d.grindClicks, notes: d.notes,
    hot_notes: d.hotNotes, warm_notes: d.warmNotes, cold_notes: d.coldNotes,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) {
    // reverse the inventory move when the row update did not persist
    if (delta !== 0) {
      const { data: coffee } = await db.from("coffees").select("remaining_weight_g").eq("id", d.coffeeId).single();
      if (coffee?.remaining_weight_g != null) {
        await db.from("coffees").update({
          remaining_weight_g: applyInventoryDelta(Number(coffee.remaining_weight_g), -delta),
        }).eq("id", d.coffeeId);
      }
    }
    return;
  }
  revalidatePath(`/coffees/${coffeeId}`);
  redirect(`/coffees/${coffeeId}`);
}

export async function deleteCupping(id: string, coffeeId: string): Promise<void> {
  const { restoredAfter } = await import("@/lib/domain/inventory");
  const db = await createClient();
  // read the dose first (RLS-scoped): deleting hands the coffee back, exactly
  // what this cupping consumed — never derived from current stock.
  const { data: cupping } = await db.from("cuppings").select("dose_g, coffee_id").eq("id", id).single();
  if (!cupping) return;
  const dose = Number((cupping.dose_g as number | null) ?? 0);
  const ownerId = (cupping.coffee_id as string) ?? coffeeId;
  if (dose > 0) {
    const { data: coffee } = await db.from("coffees").select("remaining_weight_g").eq("id", ownerId).single();
    if (coffee?.remaining_weight_g != null) {
      const { error: invError } = await db.from("coffees").update({
        remaining_weight_g: restoredAfter(Number(coffee.remaining_weight_g), dose),
      }).eq("id", ownerId);
      if (invError) return;
    }
  }
  const { error } = await db.from("cuppings").delete().eq("id", id);
  if (error) {
    // reverse the restore when the delete did not happen
    if (dose > 0) {
      const { data: coffee } = await db.from("coffees").select("remaining_weight_g").eq("id", ownerId).single();
      if (coffee?.remaining_weight_g != null) {
        await db.from("coffees").update({
          remaining_weight_g: Math.max(0, Number(coffee.remaining_weight_g) - dose),
        }).eq("id", ownerId);
      }
    }
    return;
  }
  revalidatePath(`/coffees/${coffeeId}`);
  redirect(`/coffees/${coffeeId}`);
}

// --- Development seed -------------------------------------------------------
// ponytail: no seed.sql because SQL editor/CLI run outside any auth context —
// auth.uid() is NULL there, so rows cannot be attributed to the dev user except
// by hard-coding a UUID. These actions insert through the caller's own session,
// so RLS applies end-to-end exactly as in production. Gated by ALLOW_DEV_SEED.

function seedAllowed(): boolean {
  return process.env.ALLOW_DEV_SEED === "true";
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

async function deleteSeedRows(db: Awaited<ReturnType<typeof createClient>>): Promise<void> {
  const { SEED_COFFEE_NAMES, SEED_SESSION_TITLES } = await import("@/lib/seed/demo-data");
  const { data: coffees } = await db.from("coffees").select("id").in("name", SEED_COFFEE_NAMES);
  const coffeeIds = (coffees ?? []).map((c) => c.id);
  const { data: sessions } = await db.from("sessions").select("id").in("title", SEED_SESSION_TITLES);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  let brewIds: string[] = [];
  if (coffeeIds.length > 0) {
    const { data: brews } = await db.from("brews").select("id").in("coffee_id", coffeeIds);
    brewIds = (brews ?? []).map((b) => b.id);
  }
  // experiments first: coffee delete cascades brews but only nulls experiment brew links
  if (brewIds.length > 0) await db.from("experiments").delete().in("brew_id", brewIds);
  if (sessionIds.length > 0) await db.from("experiments").delete().in("session_id", sessionIds);
  if (coffeeIds.length > 0) await db.from("coffees").delete().in("id", coffeeIds);
  if (sessionIds.length > 0) await db.from("sessions").delete().in("id", sessionIds);
}

export async function seedDevData(): Promise<void> {
  if (!seedAllowed()) return;
  const {
    SEED_BREWS, SEED_COFFEES, SEED_EXPERIMENTS, SEED_OBSERVATIONS, SEED_SESSIONS,
  } = await import("@/lib/seed/demo-data");
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  await deleteSeedRows(db); // idempotent: reset then insert
  const sessionIds: Record<string, string> = {};
  for (const s of SEED_SESSIONS) {
    const { data: row, error } = await db.from("sessions")
      .insert({ title: s.title, notes: s.notes, created_at: daysAgoIso(s.daysAgo) })
      .select("id").single();
    if (error) redirect(`/coffees?error=${encodeURIComponent(error.message)}`);
    sessionIds[s.slug] = row.id;
  }
  const coffeeIds: Record<string, string> = {};
  for (const c of SEED_COFFEES) {
    const { data: row, error } = await db.from("coffees")
      .insert({
        name: c.name, origin: c.origin, process: c.process, roast_date: c.roastDate,
        received_date: c.receivedDate, initial_weight_g: c.initialWeightG,
        remaining_weight_g: c.remainingWeightG, notes: c.notes, created_at: daysAgoIso(c.daysAgo),
      })
      .select("id").single();
    if (error) redirect(`/coffees?error=${encodeURIComponent(error.message)}`);
    coffeeIds[c.slug] = row.id;
  }
  const brewIds: Record<string, string> = {};
  for (const b of SEED_BREWS) {
    const { data: row, error } = await db.from("brews")
      .insert({
        coffee_id: coffeeIds[b.coffeeSlug],
        session_id: b.sessionSlug ? sessionIds[b.sessionSlug] : undefined,
        dose_g: b.doseG, water_g: b.waterG, temp_c: b.tempC, grind_clicks: b.grindClicks,
        grinder: b.grinder, dripper: b.dripper, filter: b.filter, water_source: b.waterSource,
        pour_count: b.pourCount, total_time_sec: b.totalTimeSec,
        final_beverage_g: b.finalBeverageG, notes: b.notes, created_at: daysAgoIso(b.daysAgo),
        brewed_at: daysAgoIso(b.daysAgo),
      })
      .select("id").single();
    if (error) redirect(`/coffees?error=${encodeURIComponent(error.message)}`);
    brewIds[b.slug] = row.id;
  }
  for (const o of SEED_OBSERVATIONS) {
    const { error } = await db.from("observations").insert({
      brew_id: brewIds[o.brewSlug], acidity: o.acidity, sweetness: o.sweetness, body: o.body,
      clarity: o.clarity, bitterness: o.bitterness, astringency: o.astringency,
      intensity: o.intensity, balance: o.balance, finish: o.finish,
      hot_notes: o.hotNotes, warm_notes: o.warmNotes, cold_notes: o.coldNotes,
      freeform_notes: o.freeformNotes, created_at: daysAgoIso(o.daysAgo),
    });
    if (error) redirect(`/coffees?error=${encodeURIComponent(error.message)}`);
  }
  for (const e of SEED_EXPERIMENTS) {
    const { error } = await db.from("experiments").insert({
      brew_id: e.brewSlug ? brewIds[e.brewSlug] : undefined,
      session_id: e.sessionSlug ? sessionIds[e.sessionSlug] : undefined,
      hypothesis: e.hypothesis, changed_variables: e.changedVariables,
      expected_result: e.expectedResult, actual_result: e.actualResult,
      conclusion: e.conclusion, next_question: e.nextQuestion,
      created_at: daysAgoIso(e.daysAgo),
    });
    if (error) redirect(`/coffees?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/coffees");
  revalidatePath("/brews");
  revalidatePath("/sessions");
  redirect("/coffees");
}

export async function resetDevData(): Promise<void> {
  if (!seedAllowed()) return;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  await deleteSeedRows(db);
  revalidatePath("/coffees");
  revalidatePath("/brews");
  revalidatePath("/sessions");
  redirect("/coffees");
}
