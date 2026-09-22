import { brewRatio, formatRatio } from "@/lib/domain/ratio";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatDuration } from "@/lib/domain/brew-time";

// ponytail: compare works on pre-resolved scalar strings, never on joined rows.
// Nested relations (coffee/session/observations) are flattened to names/values
// here, so diffBrews can never render [object Object] or raw UUIDs.
export type BrewRow = Record<string, unknown>;

function str(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function toComparableBrew(brew: BrewRow): Record<string, string> {
  const dose = Number(brew.dose_g);
  const water = Number(brew.water_g);
  const ratio = brewRatio(dose, water);
  const obs = one(brew.observations as Record<string, unknown>[] | Record<string, unknown> | null | undefined) ?? {};
  const coffee = one(brew.coffees as Record<string, unknown>[] | Record<string, unknown> | null | undefined);
  const session = one(brew.sessions as Record<string, unknown>[] | Record<string, unknown> | null | undefined);
  const time = formatDuration(brew.total_time_sec as number | null);
  return {
    Coffee: (coffee?.name as string) ?? "Unknown coffee",
    Session: (session?.title as string) ?? "No session",
    Dose: brew.dose_g != null ? `${brew.dose_g} g` : "—",
    Water: brew.water_g != null ? `${brew.water_g} g` : "—",
    Ratio: ratio == null ? "—" : `1:${ratio}`,
    Temperature: brew.temp_c != null && brew.temp_c !== "" ? `${brew.temp_c}°C` : "—",
    Grind: brew.grind_clicks != null && brew.grind_clicks !== "" ? `${brew.grind_clicks} clicks` : "—",
    Grinder: str(brew.grinder),
    Dripper: str(brew.dripper),
    Filter: str(brew.filter),
    "Water source": str(brew.water_source),
    Pours: brew.pour_count != null && brew.pour_count !== "" ? `${brew.pour_count}` : "—",
    "Brew time": time ?? "—",
    "Final beverage": brew.final_beverage_g != null && brew.final_beverage_g !== "" ? `${brew.final_beverage_g} g` : "—",
    "Process notes": str(brew.notes),
    Acidity: str(obs.acidity),
    Sweetness: str(obs.sweetness),
    Body: str(obs.body),
    Clarity: str(obs.clarity),
    Bitterness: str(obs.bitterness),
    Astringency: str(obs.astringency),
    Intensity: str(obs.intensity),
    Balance: str(obs.balance),
    Finish: str(obs.finish),
    "Hot notes": str(obs.hot_notes),
    "Warm notes": str(obs.warm_notes),
    "Cold notes": str(obs.cold_notes),
    "Tasting notes": str(obs.freeform_notes),
  };
}

// Selector option for the compare dropdowns: ratio · coffee · day.
export type CompareOptionRow = {
  id: string;
  dose_g: number;
  water_g: number;
  brewed_at: string | null;
  created_at: string;
  coffees: { name: string } | { name: string }[] | null;
};

export function toCompareOption(b: CompareOptionRow): { id: string; label: string } {
  const coffee = Array.isArray(b.coffees) ? b.coffees[0]?.name : b.coffees?.name;
  return {
    id: b.id,
    label: `${formatRatio(Number(b.dose_g), Number(b.water_g))} · ${coffee ?? "Coffee"} · ${formatBrewDate(b.brewed_at ?? b.created_at)}`,
  };
}

// URL state for independent selection: explicit params win when they point at
// real, distinct brews; otherwise fall back to the latest two. Null when there
// is nothing to compare — refresh and bookmarks re-derive the same pair.
export function resolveCompareIds(
  ids: string[],
  a?: string | null,
  b?: string | null,
): { aId: string; bId: string } | null {
  if (ids.length < 2) return null;
  const aId = a && ids.includes(a) ? a : ids[0];
  const bId = b && ids.includes(b) && b !== aId ? b : ids.find((id) => id !== aId)!;
  return { aId, bId };
}
