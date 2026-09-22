import { COMPETITION_DEFAULTS } from "./defaults";
import { defaultBrewedDate } from "./brew-date";
import type { NewBrewFormInput } from "../validation/schemas";

export type PreviousBrew = Record<string, string | number | undefined> | null;

// "Create new Brew from previous recipe": starting values for a fresh brew
// form. Copies recipe/equipment only — dose, water, temperature, grind,
// grinder, dripper, filter, water, pours — plus session continuity.
//
// Never copies historical/result data: preparation date (starts today),
// brew time, final beverage, brew notes, tasting notes, lifecycle state.
// The previous brew record is never touched; the new brew saves independently.
export function recipeStartingValues(previous: PreviousBrew, coffeeId: string): NewBrewFormInput {
  const p = previous ?? {};
  return {
    coffeeId: (p.coffee_id as string) ?? coffeeId ?? "",
    // a new preparation always starts at today, never the previous brew date
    brewedAt: defaultBrewedDate(),
    sessionId: (p.session_id as string) ?? undefined,
    doseG: Number(p.dose_g ?? COMPETITION_DEFAULTS.doseG),
    waterG: Number(p.water_g ?? COMPETITION_DEFAULTS.waterG),
    tempC: p.temp_c != null ? Number(p.temp_c) : COMPETITION_DEFAULTS.tempC,
    grindClicks: p.grind_clicks != null ? Number(p.grind_clicks) : COMPETITION_DEFAULTS.grindClicks,
    grinder: (p.grinder as string) ?? COMPETITION_DEFAULTS.grinder,
    dripper: (p.dripper as string) ?? COMPETITION_DEFAULTS.dripper,
    filter: (p.filter as string) ?? COMPETITION_DEFAULTS.filter,
    waterSource: (p.water_source as string) ?? COMPETITION_DEFAULTS.waterSource,
    pourCount: p.pour_count != null ? Number(p.pour_count) : COMPETITION_DEFAULTS.pourCount,
    // result data starts empty on every fresh brew
    brewTimeMin: undefined,
    brewTimeSec: undefined,
    finalBeverageG: undefined,
    notes: undefined,
    hotNotes: undefined,
    warmNotes: undefined,
    coldNotes: undefined,
    freeformNotes: undefined,
  };
}
