import { brewRatio, formatRatio } from "@/lib/domain/ratio";
import { pouredTotalG } from "@/lib/domain/brew-water";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatDuration } from "@/lib/domain/brew-time";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

// ponytail: compare works on pre-resolved scalar strings, never on joined rows.
// Nested relations (coffee/session/observations) are flattened to names/values
// here, so diffBrews can never render [object Object] or raw UUIDs.
export type BrewRow = Record<string, unknown>;

function str(v: unknown): string {
  if (v == null || v === "") return "-";
  return String(v);
}

// Booleans: "Yes"/"No" when a flag exists, "-" only when unrecorded (the
// not-null default false reads as unrecorded for legacy rows).
function flag(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "-";
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function toComparableBrew(brew: BrewRow, pours?: { amount_g?: unknown }[] | null): Record<string, string> {
  const dose = Number(brew.dose_g);
  const water = Number(brew.water_g);
  // ratio reflects actual brew water: poured total when pours exist
  const poured = pouredTotalG(pours);
  const actual = poured ?? (Number.isFinite(water) ? water : null);
  const ratio = brewRatio(dose, actual ?? NaN);
  const obs = one(brew.observations as Record<string, unknown>[] | Record<string, unknown> | null | undefined) ?? {};
  const coffee = one(brew.coffees as Record<string, unknown>[] | Record<string, unknown> | null | undefined);
  const session = one(brew.sessions as Record<string, unknown>[] | Record<string, unknown> | null | undefined);
  const time = formatDuration(brew.total_time_sec as number | null);
  return {
    Coffee: (coffee?.name as string) ?? "Unknown coffee",
    Session: (session?.title as string) ?? "No session",
    "Selected beans": flag(brew.selected_beans),
    Dose: brew.dose_g != null ? `${brew.dose_g} g` : "-",
    // planned recipe water stays distinct from the actual Poured row, which
    // lives in the water/pours section with the numeric bypass
    "Planned water": brew.water_g != null ? `${brew.water_g} g` : "-",
    Poured: poured != null ? `${poured} g` : "-",
    "Bypass (g)": brew.bypass_g != null && brew.bypass_g !== "" ? `${brew.bypass_g} g` : "-",
    Ratio: ratio == null ? "-" : `1:${ratio}`,
    // brews.temp_c is the starting temperature; per-pour temps compare separately
    "Starting temperature": brew.temp_c != null && brew.temp_c !== "" ? `${brew.temp_c}°C` : "-",
    Grind: brew.grind_clicks != null && brew.grind_clicks !== "" ? `${brew.grind_clicks} clicks` : "-",
    Grinder: str(brew.grinder),
    Dripper: str(brew.dripper),
    Filter: str(brew.filter),
    "Water source": str(brew.water_source),
    "Water brand": str(brew.water_brand),
    PPM: brew.water_ppm != null && brew.water_ppm !== "" ? `${brew.water_ppm} ppm` : "-",
    "Water description": str(brew.water_description),
    "Water notes": str(brew.water_notes),
    "Thermal shock": str(brew.thermal_shock),
    Bypass: str(brew.bypass),
    LilyDrip: flag(brew.lilydrip),
    MeloDrip: flag(brew.melodrip),
    Pours: brew.pour_count != null && brew.pour_count !== "" ? `${brew.pour_count}` : "-",
    "Brew time": time ?? "-",
    "Final beverage": brew.final_beverage_g != null && brew.final_beverage_g !== "" ? `${brew.final_beverage_g} g` : "-",
    "Process notes": str(brew.notes),
    // Structured tasting lives in tastings, compared separately per
    // stage/attribute. Only free-text notes stay in this scalar diff.
    "Hot notes": str(obs.hot_notes),
    "Warm notes": str(obs.warm_notes),
    "Cold notes": str(obs.cold_notes),
    "Overall notes": str(obs.freeform_notes),
  };
}

// Explicit compare sections: fixed order, never object ordering. Recipe
// covers brew setup, notes cover the free-text observation record.
// Structured tasting compares separately per stage/attribute.
export const COMPARE_RECIPE_FIELDS = [
  "Coffee", "Session", "Selected beans", "Dose", "Planned water", "Ratio", "Starting temperature", "Grind",
  "Grinder", "Dripper", "Filter", "Water source", "Water brand", "PPM", "Water description",
  "Water notes", "Thermal shock", "Bypass", "LilyDrip", "MeloDrip",
  "Pours", "Brew time", "Final beverage",
] as const;

export const COMPARE_NOTE_FIELDS = [
  "Process notes", "Hot notes", "Warm notes", "Cold notes", "Overall notes",
] as const;

// One comparison row across N brews. values keeps slot order matching the
// input brews; "-" = unrecorded. changed per valuesChanged.
export type CompareRow = {
  label: string;
  values: string[];
  changed: boolean;
};

// Rows for one compare section over N pre-resolved scalar maps. Rows are
// hidden when unrecorded on every brew ("-" = unknown) or when every recorded
// value is "No": false is the not-null default, so all-No carries no signal.
export function compareRowsFor(scalars: Record<string, string>[], fields: readonly string[]): CompareRow[] {
  return fields
    .map((label) => ({ label, values: scalars.map((s) => s[label] ?? "-") }))
    .filter((r) => r.values.some((v) => v !== "-") && !r.values.every((v) => v === "No"))
    .map((r) => ({ ...r, changed: valuesChanged(r.values) }));
}

// Selector option for the compare dropdowns: ratio · coffee · day · session.
export type CompareOptionRow = {
  id: string;
  dose_g: number;
  water_g: number;
  brewed_at: string | null;
  created_at: string;
  coffees: { name: string } | { name: string }[] | null;
  sessions: { title: string } | { title: string }[] | null;
};

// Searchable selector option. `label` stays the full searchable string
// (ratio · coffee · date · session); `title`/`detail` drive the compact
// two-line result row. Deep-link stubs only carry id+label.
export type BrewOption = { id: string; label: string; title?: string; detail?: string };

export function toCompareOption(b: CompareOptionRow): BrewOption {
  const coffee = Array.isArray(b.coffees) ? b.coffees[0]?.name : b.coffees?.name;
  const session = Array.isArray(b.sessions) ? b.sessions[0]?.title : b.sessions?.title;
  const date = formatBrewDate(b.brewed_at ?? b.created_at);
  const ratio = formatRatio(Number(b.dose_g), Number(b.water_g));
  const parts = [ratio, coffee ?? "Coffee", date];
  if (session) parts.push(session);
  return {
    id: b.id,
    label: parts.join(" · "),
    title: coffee ?? session ?? "Brew",
    detail: [date, `${b.dose_g} g → ${b.water_g} g`, ratio].join(" · "),
  };
}

// Selected brew always stays listed, even mid-search (matches the old filter).
export function filterBrewOptions(options: BrewOption[], query: string, selectedId: string): BrewOption[] {
  const q = query.trim().toLowerCase();
  if (q === "") return options;
  return options.filter((o) => o.id === selectedId || o.label.toLowerCase().includes(q));
}

// Roving highlight for ArrowUp/ArrowDown, wrapping both ways.
export function stepActive(current: number, delta: number, length: number): number {
  if (length === 0) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return (current + delta + length) % length;
}

// URL state for up to COMPARE_MAX independent slots (?a=&b=&c=&d=): explicit
// params win when they point at real, distinct brews; unknown or duplicate
// params are dropped in order. The list pads to two brews from the top of
// `ids` (latest first) so a one-brew deep link opens a real comparison —
// but never pads beyond two without an explicit param. Null when there is
// nothing to compare — refresh and bookmarks re-derive the same selection.
// ponytail: 4 brews is where phone-width value columns stop staying legible.
export const COMPARE_MAX = 4;

export function resolveCompareSelection(
  ids: string[],
  wanted: (string | null | undefined)[],
): string[] | null {
  if (ids.length < 2) return null;
  const picked: string[] = [];
  for (const w of wanted) {
    if (picked.length >= COMPARE_MAX) break;
    if (typeof w === "string" && ids.includes(w) && !picked.includes(w)) picked.push(w);
  }
  for (const id of ids) {
    if (picked.length >= 2) break;
    if (!picked.includes(id)) picked.push(id);
  }
  return picked.length >= 2 ? picked : null;
}

// "Changed" across N brews: values differ, including a recorded value next to
// an unrecorded "-". Identical values (any count) are not a change.
export function valuesChanged(values: string[]): boolean {
  return new Set(values).size > 1;
}

// Slot header labels, fixed vocabulary like the tasting attributes.
export const COMPARE_SLOT_KEYS: TranslationKey[] = ["compare.brew1", "compare.brew2", "compare.brew3", "compare.brew4"];
