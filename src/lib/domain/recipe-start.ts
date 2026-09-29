import { defaultBrewedDate } from "./brew-date";
import { pourRowsToJson, pourServerRowsToDraft, type PourFact } from "./pours";
import type { NewBrewFormInput } from "../validation/schemas";

export type PreviousBrew = Record<string, string | number | boolean | null | undefined> | null;

// React key for the new-brew form: two navigations produce the same form only
// when they initialize it identically. react-hook-form ignores fresh
// defaultValues on an already-mounted instance, so a /brews/new -> /brews/new
// click-path (Continue from last brew, New from this) must remount when the
// initialization source changes; keeping the key for an unchanged source
// preserves a half-typed form across null re-renders.
export function formInitKey(copySourceId: string | null | undefined, coffeeId?: string): string {
  return copySourceId ? `copy-${copySourceId}` : `blank${coffeeId ? `-${coffeeId}` : ""}`;
}

// Which fields were actually carried over from the previous brew. Used to
// apply inherited-field tinting only to inputs that received a value; empty
// fields must not look inherited just because a copy source exists.
export function inheritedFieldNames(
  previous: PreviousBrew,
  pours?: PourFact[] | null,
): Set<keyof NewBrewFormInput> {
  const p = previous ?? {};
  const inherited = new Set<keyof NewBrewFormInput>();
  if (p.coffee_id != null && p.coffee_id !== "") inherited.add("coffeeId");
  if (p.session_id != null && p.session_id !== "") inherited.add("sessionId");
  if (p.dose_g != null && p.dose_g !== "") inherited.add("doseG");
  if (p.water_g != null && p.water_g !== "") inherited.add("waterG");
  if (p.temp_c != null && p.temp_c !== "") inherited.add("tempC");
  if (p.grind_clicks != null && p.grind_clicks !== "") inherited.add("grindClicks");
  if (p.grinder != null && p.grinder !== "") inherited.add("grinder");
  if (p.dripper != null && p.dripper !== "") inherited.add("dripper");
  if (p.filter != null && p.filter !== "") inherited.add("filter");
  if (p.water_source != null && p.water_source !== "") inherited.add("waterSource");
  if (p.selected_beans === true) inherited.add("selectedBeans");
  // water & technique ride the recipe like the equipment fields
  if (p.water_brand != null && p.water_brand !== "") inherited.add("waterBrand");
  if (p.water_ppm != null && p.water_ppm !== "") inherited.add("waterPpm");
  if (p.water_description != null && p.water_description !== "") inherited.add("waterDescription");
  if (p.thermal_shock != null && p.thermal_shock !== "") inherited.add("thermalShock");
  if (p.bypass != null && p.bypass !== "") inherited.add("bypass");
  if (p.lilydrip === true) inherited.add("lilydrip");
  if (p.melodrip === true) inherited.add("melodrip");
  if (p.hario_switch === true) inherited.add("harioSwitch");
  if (p.pour_count != null && p.pour_count !== "") inherited.add("pourCount");
  if ((pours ?? []).length > 0) inherited.add("pours");
  return inherited;
}

// "Create new Brew from previous recipe": starting values for a fresh brew
// form. Copies recipe/equipment only - dose, water, temperature, grind,
// grinder, dripper, filter, water, water record (brand/ppm/description),
// technique (thermal shock, bypass, Lilydrip, Melodrip), pours, structured
// pours - plus session continuity.
//
// Nothing is invented: a genuinely fresh brew starts empty (the user types
// every value), and a copy inherits only what the previous brew recorded -
// missing values stay missing, never backfilled from a template. Also never
// copied: preparation date (starts today), brew time, final beverage, brew
// notes, water notes (annotation, same reset category), tasting
// attributes/scores/notes. The previous record is never touched; the new
// brew saves independently.
export function recipeStartingValues(
  previous: PreviousBrew,
  coffeeId: string,
  pours?: PourFact[] | null,
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
    selectedBeans: p.selected_beans === true ? true : undefined,
    waterBrand: str(p.water_brand),
    waterPpm: num(p.water_ppm),
    waterDescription: str(p.water_description),
    thermalShock: str(p.thermal_shock),
    bypass: str(p.bypass),
    lilydrip: p.lilydrip === true ? true : undefined,
    melodrip: p.melodrip === true ? true : undefined,
    harioSwitch: p.hario_switch === true ? true : undefined,
    pourCount: num(p.pour_count),
    // result data starts empty on every fresh brew
    brewTimeMin: undefined,
    brewTimeSec: undefined,
    finalBeverageG: undefined,
    notes: undefined,
    // S6: expectation belongs to the brew it was written for, never the next
    expectedText: undefined,
    // tasting always starts clean: never inherited, never invented
    tastings: undefined,
    // structured pours are recipe: inherited when the previous brew has any,
    // otherwise the new brew starts with none (never synthesized from text)
    pours: (pours ?? []).length > 0 ? pourRowsToJson(pourServerRowsToDraft(pours)) : undefined,
    hotNotes: undefined,
    warmNotes: undefined,
    coldNotes: undefined,
    freeformNotes: undefined,
  };
}
