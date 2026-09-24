import { formatBrewDate } from "@/lib/domain/brew-date";

// ponytail: list search filters already-loaded rows locally — never a request
// per keystroke. Matchers collect the human-readable fields of each entity
// into one haystack; matching is case-insensitive substring.

type Rel = Record<string, unknown> | Record<string, unknown>[] | null | undefined;

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function relName(v: Rel): string {
  const o = one(v as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
  return typeof o?.name === "string" ? o.name : "";
}

function relTitle(v: Rel): string {
  const o = one(v as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
  return typeof o?.title === "string" ? o.title : "";
}

function dayStrings(v: unknown): string[] {
  if (typeof v !== "string" || v === "") return [];
  return [v.slice(0, 10), formatBrewDate(v)];
}

function observationText(v: unknown): string[] {
  const rows = Array.isArray(v) ? v : v != null ? [v] : [];
  const out: string[] = [];
  for (const r of rows) {
    if (typeof r !== "object" || r === null) continue;
    for (const val of Object.values(r as Record<string, unknown>)) {
      if (typeof val === "string" && val !== "") out.push(val);
    }
  }
  return out;
}

export function matchesQuery(haystack: string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return haystack.some((h) => h.toLowerCase().includes(q));
}

export type BrewSearchRow = {
  dose_g?: unknown;
  water_g?: unknown;
  notes?: unknown;
  brewed_at?: unknown;
  created_at?: unknown;
  coffees?: Rel;
  sessions?: Rel;
  session?: { title: string } | null;
  observations?: unknown;
};

export function brewHaystack(b: BrewSearchRow): string[] {
  return [
    relName(b.coffees),
    relTitle(b.sessions) || (typeof b.session?.title === "string" ? b.session.title : ""),
    ...dayStrings(b.brewed_at),
    ...dayStrings(b.created_at),
    typeof b.notes === "string" ? b.notes : "",
    ...observationText(b.observations),
  ];
}

export function matchBrew(b: BrewSearchRow, query: string): boolean {
  return matchesQuery(brewHaystack(b), query);
}

export type CoffeeSearchRow = {
  name?: unknown;
  origin?: unknown;
  process?: unknown;
  variety?: unknown;
  producer?: unknown;
  country?: unknown;
  region?: unknown;
  farm?: unknown;
  altitude?: unknown;
  notes?: unknown;
};

export function matchCoffee(c: CoffeeSearchRow, query: string): boolean {
  return matchesQuery(
    [c.name, c.origin, c.process, c.variety, c.producer, c.country, c.region, c.farm, c.altitude, c.notes].map((v) => (typeof v === "string" ? v : "")),
    query,
  );
}

export type CuppingSearchRow = {
  cupped_at?: unknown;
  grinder?: unknown;
  grind_clicks?: unknown;
  notes?: unknown;
  hot_notes?: unknown;
  warm_notes?: unknown;
  cold_notes?: unknown;
  coffees?: Rel;
  coffeeName?: string;
};

export function matchCupping(c: CuppingSearchRow, query: string): boolean {
  return matchesQuery(
    [
      c.coffeeName ?? relName(c.coffees),
      ...dayStrings(c.cupped_at),
      typeof c.grinder === "string" ? c.grinder : "",
      c.grind_clicks != null ? String(c.grind_clicks) : "",
      ...[c.notes, c.hot_notes, c.warm_notes, c.cold_notes].map((v) =>
        typeof v === "string" ? v : "",
      ),
    ],
    query,
  );
}
