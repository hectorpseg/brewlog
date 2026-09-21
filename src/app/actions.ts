"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { coffeeSchema, brewSchema, observationSchema, experimentSchema, sessionSchema } from "@/lib/validation/schemas";

// ponytail: thin zod-then-insert actions; RLS enforces ownership, user_id never from client

export async function login(formData: FormData): Promise<void> {
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/coffees");
}

export async function signup(formData: FormData): Promise<void> {
  const db = await createClient();
  const { error } = await db.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/coffees");
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
    roast_date: d.roastDate, received_date: d.receivedDate,
    initial_weight_g: d.initialWeightG, remaining_weight_g: d.remainingWeightG,
    notes: d.notes, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return;
  revalidatePath("/coffees");
}

export async function createBrew(prev: unknown, formData: FormData): Promise<{ error?: string; id?: string }> {
  const parsed = brewSchema.safeParse({
    coffeeId: nullish(formData.get("coffeeId")),
    doseG: nullish(formData.get("doseG")),
    waterG: nullish(formData.get("waterG")),
    tempC: nullish(formData.get("tempC")),
    grindClicks: nullish(formData.get("grindClicks")),
    grinder: nullish(formData.get("grinder")),
    dripper: nullish(formData.get("dripper")),
    filter: nullish(formData.get("filter")),
    waterSource: nullish(formData.get("waterSource")),
    pourCount: nullish(formData.get("pourCount")),
    totalTimeSec: nullish(formData.get("totalTimeSec")),
    finalBeverageG: nullish(formData.get("finalBeverageG")),
    notes: nullish(formData.get("notes")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid brew" };
  const d = parsed.data;
  const db = await createClient();
  const { data, error } = await db.from("brews").insert({
    coffee_id: d.coffeeId, dose_g: d.doseG, water_g: d.waterG, temp_c: d.tempC,
    grind_clicks: d.grindClicks, grinder: d.grinder, dripper: d.dripper,
    filter: d.filter, water_source: d.waterSource, pour_count: d.pourCount,
    total_time_sec: d.totalTimeSec, final_beverage_g: d.finalBeverageG, notes: d.notes,
  }).select("id").single();
  if (error) return { error: error.message };
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
  const db = await createClient();
  const map: Record<string, string> = {
    tempC: "temp_c", grindClicks: "grind_clicks", grinder: "grinder", dripper: "dripper",
    filter: "filter", waterSource: "water_source", pourCount: "pour_count",
    totalTimeSec: "total_time_sec", finalBeverageG: "final_beverage_g", notes: "notes",
    doseG: "dose_g", waterG: "water_g",
  };
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined && patch[k] !== "") row[col] = patch[k];
  }
  const { error } = await db.from("brews").update(row).eq("id", id);
  if (error) return { error: error.message };
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

export async function createExperiment(formData: FormData): Promise<void> {
  const parsed = experimentSchema.safeParse({
    brewId: nullish(formData.get("brewId")),
    sessionId: nullish(formData.get("sessionId")),
    hypothesis: nullish(formData.get("hypothesis")),
    changedVariables: nullish(formData.get("changedVariables")),
    expectedResult: nullish(formData.get("expectedResult")),
    actualResult: nullish(formData.get("actualResult")),
    conclusion: nullish(formData.get("conclusion")),
    nextQuestion: nullish(formData.get("nextQuestion")),
  });
  if (!parsed.success) return;
  const d = parsed.data;
  const db = await createClient();
  const { error } = await db.from("experiments").insert({
    brew_id: d.brewId, session_id: d.sessionId, hypothesis: d.hypothesis,
    changed_variables: d.changedVariables, expected_result: d.expectedResult,
    actual_result: d.actualResult, conclusion: d.conclusion, next_question: d.nextQuestion,
  });
  if (error) return;
  revalidatePath("/brews");
}

export async function createSession(formData: FormData): Promise<void> {
  const parsed = sessionSchema.safeParse({ title: nullish(formData.get("title")), notes: nullish(formData.get("notes")) });
  if (!parsed.success) return;
  const db = await createClient();
  const { error } = await db.from("sessions").insert({ title: parsed.data.title, notes: parsed.data.notes });
  if (error) return;
  revalidatePath("/sessions");
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
