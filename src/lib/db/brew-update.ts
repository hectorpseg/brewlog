// ponytail: pure field mapping for brew updates, so the session-clearing and
// empty-skip rules are unit-testable without touching the database.
import { toBrewedAtIso } from "@/lib/domain/brew-date";

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
