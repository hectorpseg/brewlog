// ponytail: pure field mapping for brew updates, so the session-clearing and
// empty-skip rules are unit-testable without touching the database.
import { toBrewedAtIso, toDateInputValue } from "@/lib/domain/brew-date";
import { splitSeconds } from "@/lib/domain/brew-time";
import { tastingRowsToJson, tastingServerRowsToDraft } from "@/lib/domain/tastings";
import {
  completePourEntries, pourRowsFromJson, pourRowsToJson, pourServerRowsToDraft,
  type PourEntry,
} from "@/lib/domain/pours";

export const SENSORY_KEYS = [
  "acidity", "sweetness", "body", "clarity", "bitterness",
  "astringency", "intensity", "balance", "finish",
] as const;

export type BrewRowLike = Record<string, unknown>;
export type ObservationLike = Record<string, unknown> | null;

// Row → editor initial state. Every persisted recipe/equipment column must
// appear here: omitting one shows an empty input on reopen even though the
// database holds the value (and "Brew again" inherits correctly, hiding it).
export function brewEditorDefaults(
  brew: BrewRowLike,
  observation: ObservationLike,
  tastings?: { stage: unknown; attribute: unknown; value: unknown }[] | null,
  pours?: { sequence?: unknown; amount_g?: unknown; timing_seconds?: unknown; bloom?: unknown; pattern?: unknown; note?: unknown }[] | null,
): Record<string, string> {
  const str = (v: unknown) => String((v as string | number | null) ?? "");
  const initialTime = splitSeconds(
    brew.total_time_sec != null ? Number(brew.total_time_sec) : undefined,
  );
  return {
    doseG: str(brew.dose_g),
    waterG: str(brew.water_g),
    brewedAt: toDateInputValue(typeof brew.brewed_at === "string" ? brew.brewed_at : null),
    tempC: str(brew.temp_c),
    grindClicks: str(brew.grind_clicks),
    grinder: str(brew.grinder),
    dripper: str(brew.dripper),
    filter: str(brew.filter),
    waterSource: str(brew.water_source),
    pourCount: str(brew.pour_count),
    sessionId: str(brew.session_id),
    finalBeverageG: str(brew.final_beverage_g),
    brewTimeMin: initialTime.minutes != null ? String(initialTime.minutes) : "",
    brewTimeSec: initialTime.seconds != null ? String(initialTime.seconds) : "",
    notes: str(brew.notes),
    ...Object.fromEntries(SENSORY_KEYS.map((k) => [k, str(observation?.[k])])),
    hotNotes: str(observation?.hot_notes),
    warmNotes: str(observation?.warm_notes),
    coldNotes: str(observation?.cold_notes),
    freeformNotes: str(observation?.freeform_notes),
    // structured tasting rides the same autosave draft as one JSON field;
    // toBrewUpdateRow ignores it, the sync step persists it via upsertTastings
    tastings: tastingRowsToJson(tastingServerRowsToDraft(tastings)),
    // structured pours ride alongside: ignored by toBrewUpdateRow, the sync
    // step persists them via upsertPours. Brews without pours stay empty.
    pours: pourRowsToJson(pourServerRowsToDraft(pours)),
  };
}

export function toBrewUpdateRow(patch: Record<string, string | undefined>): Record<string, string | number | null> {
  const map: Record<string, string> = {
    tempC: "temp_c",
    grindClicks: "grind_clicks",
    grinder: "grinder",
    dripper: "dripper",
    filter: "filter",
    waterSource: "water_source",
    pourCount: "pour_count",
    totalTimeSec: "total_time_sec",
    finalBeverageG: "final_beverage_g",
    notes: "notes",
    doseG: "dose_g",
    waterG: "water_g",
  };
  const row: Record<string, string | number | null> = {};
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined && patch[k] !== "") row[col] = patch[k];
  }
  // session is clearable: explicit empty choice unassigns the brew
  if (patch.sessionId !== undefined) row.session_id = patch.sessionId === "" ? null : patch.sessionId;
  // preparation date: calendar day in, noon-UTC instant out; invalid falls back
  // to untouched (the action keeps the existing value by omitting the column)
  if (patch.brewedAt !== undefined && patch.brewedAt !== "") {
    const iso = toBrewedAtIso(patch.brewedAt);
    if (iso !== undefined) row.brewed_at = iso;
  }
  return row;
}

// Form keys per persistence slice, so the autosave sync can skip slices the
// user did not touch. Same-shape comparison only (form vs last-synced form);
// server shapes are never compared here, so normalization drift cannot cause
// false dirty flags.
export const BREW_RECIPE_KEYS = [
  "doseG", "waterG", "brewedAt", "tempC", "grindClicks", "grinder", "dripper",
  "filter", "waterSource", "pourCount", "sessionId", "finalBeverageG",
  "brewTimeMin", "brewTimeSec", "totalTimeSec", "notes",
] as const;

export const BREW_NOTE_KEYS = [
  ...SENSORY_KEYS, "hotNotes", "warmNotes", "coldNotes", "freeformNotes",
] as const;

export type BrewSyncSlice = "recipe" | "tastings" | "pours" | "notes";

export type BrewSyncPlan = {
  // stable order; empty when nothing changed since the baseline
  slices: BrewSyncSlice[];
  // complete pour facts for the payload (and the counter derivation)
  pourEntries: PourEntry[];
  // legacy counter derived from structured pours; null when none exist, in
  // which case the historical manual value is left untouched
  pourCount: string | null;
};

// Which independent writes a sync must perform. Pure and unit-tested: the
// editor calls one slice per dirty flag, so untouched tables are never
// rewritten and brews.updated_at only moves when recipe data actually changed.
export function planBrewSync(
  form: Record<string, string | undefined>,
  synced: Record<string, string | undefined>,
): BrewSyncPlan {
  const str = (v: string | undefined) => v ?? "";
  const pourEntries = completePourEntries(pourRowsFromJson(str(form.pours)));
  const pourCount = pourEntries.length > 0 ? String(pourEntries.length) : null;
  const slices: BrewSyncSlice[] = [];
  const recipeDirty =
    BREW_RECIPE_KEYS.some((k) => str(form[k]) !== str(synced[k])) ||
    // the counter derives from pours: a changed count dirties the recipe row
    // even when every recipe field is untouched
    (pourCount !== null && pourCount !== str(synced.pourCount));
  if (recipeDirty) slices.push("recipe");
  if (str(form.tastings) !== str(synced.tastings)) slices.push("tastings");
  if (str(form.pours) !== str(synced.pours)) slices.push("pours");
  if (BREW_NOTE_KEYS.some((k) => str(form[k]) !== str(synced[k]))) slices.push("notes");
  return { slices, pourEntries, pourCount };
}
