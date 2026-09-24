import { defaultBrewedDate } from "./brew-date";
import type { NewBrewFormInput } from "../validation/schemas";

export type PreviousBrew = Record<string, string | number | undefined> | null;

// "Create new Brew from previous recipe": starting values for a fresh brew
// form. Copies recipe/equipment only — dose, water, temperature, grind,
// grinder, dripper, filter, water, pours — plus session continuity.
//
// Nothing is invented: a genuinely fresh brew starts empty (the user types
// every value), and a copy inherits only what the previous brew recorded —
// missing values stay missing, never backfilled from a template. Also never
// copied: preparation date (starts today), brew time, final beverage, brew
// notes, tasting attributes/scores/notes. The previous record is never
// touched; the new brew saves independently.
export function recipeStartingValues(
  previous: PreviousBrew,
  coffeeId: string,
): Partial<NewBrewFormInput> {
  const p = previous ?? {};
  const num = (v: unknown): number | undefined =>
    v == null || v === "" ? undefined : Number(v);
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v !== "" ? v : undefined;
  return {
    coffeeId: (p.coffee_id as string) ?? coffeeId ?? "",
    // a new preparation always starts at today, never the previous brew date
    brewedAt: defaultBrewedDate(),
    sessionId: (p.session_id as string) ?? undefined,
    doseG: num(p.dose_g),
    waterG: num(p.water_g),
    tempC: num(p.temp_c),
    grindClicks: num(p.grind_clicks),
    grinder: str(p.grinder),
    dripper: str(p.dripper),
    filter: str(p.filter),
    waterSource: str(p.water_source),
    pourCount: num(p.pour_count),
    // result data starts empty on every fresh brew
    brewTimeMin: undefined,
    brewTimeSec: undefined,
    finalBeverageG: undefined,
    notes: undefined,
    // tasting always starts clean: never inherited, never invented
    tastings: undefined,
    hotNotes: undefined,
    warmNotes: undefined,
    coldNotes: undefined,
    freeformNotes: undefined,
  };
}
