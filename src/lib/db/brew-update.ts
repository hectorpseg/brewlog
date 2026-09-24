// ponytail: pure field mapping for brew updates, so the session-clearing and
// empty-skip rules are unit-testable without touching the database.
import { toBrewedAtIso, toDateInputValue } from "@/lib/domain/brew-date";
import { splitSeconds } from "@/lib/domain/brew-time";
import { tastingRowsToJson, tastingServerRowsToDraft } from "@/lib/domain/tastings";

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
