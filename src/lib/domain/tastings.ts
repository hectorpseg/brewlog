// ponytail: one row per (stage, attribute) fact. Stage is a field, not an
// entity — it has no independent lifecycle, so no stages table. The scale is
// a plain bounded 1-10, never an official SCA score; widen TASTING_MIN/MAX
// (and the DB CHECK) to evolve it. Legacy text levels ("low".."high") are
// deliberately NOT mapped here: that mapping would invent numbers.

export const TASTING_STAGES = ["hot", "warm", "cold"] as const;
export type TastingStage = (typeof TASTING_STAGES)[number];

export const TASTING_MIN = 1;
export const TASTING_MAX = 10;

// Suggestions only (rendered as a datalist): the model accepts any short
// custom name, so this list can grow without a migration.
export const SUGGESTED_ATTRIBUTES = [
  "acidity",
  "sweetness",
  "body",
  "clarity",
  "bitterness",
  "astringency",
  "intensity",
  "balance",
  "finish",
  "juiciness",
] as const;

export function isTastingStage(v: unknown): v is TastingStage {
  return v === "hot" || v === "warm" || v === "cold";
}

// Canonical attribute key: " Acidity " and "acidity" are the same attribute,
// so the (brew, stage, attribute) unique key cannot double-count them.
// Never truncate: overlong names fail validation instead of silently changing.
export function normalizeAttribute(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

// Complete, persistable fact. Value may be fractional later; the UI writes ints.
export type TastingEntry = {
  stage: TastingStage;
  attribute: string;
  value: number;
};

// Draft row as held by the editor: strings throughout, possibly incomplete.
// Incomplete rows live in the local draft only and are never persisted.
export type TastingDraftRow = {
  stage: TastingStage;
  attribute: string;
  value: string;
};

function draftRow(v: unknown): TastingDraftRow | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (!isTastingStage(r.stage)) return null;
  if (typeof r.attribute !== "string" || typeof r.value !== "string") return null;
  return { stage: r.stage, attribute: r.attribute, value: r.value };
}

// Lenient: restores whatever the editor held, including half-filled rows.
// Garbage shapes are dropped; validation happens at sync time, not here.
export function tastingRowsFromJson(v: unknown): TastingDraftRow[] {
  if (typeof v !== "string" || v === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: TastingDraftRow[] = [];
  for (const item of parsed) {
    const row = draftRow(item);
    if (row) out.push(row);
  }
  return out;
}

export function tastingRowsToJson(rows: TastingDraftRow[]): string {
  return JSON.stringify(rows);
}

// Server rows (numbers) into editor draft rows (strings).
export function tastingServerRowsToDraft(
  rows: { stage: unknown; attribute: unknown; value: unknown }[] | null | undefined,
): TastingDraftRow[] {
  if (!rows) return [];
  const out: TastingDraftRow[] = [];
  for (const r of rows) {
    if (typeof r !== "object" || r === null) continue;
    if (!isTastingStage(r.stage)) continue;
    const attribute = normalizeAttribute(r.attribute);
    if (attribute === "" || attribute.length > 40) continue;
    const value = typeof r.value === "number" || typeof r.value === "string" ? Number(r.value) : NaN;
    if (!Number.isFinite(value)) continue;
    out.push({ stage: r.stage, attribute, value: String(value) });
  }
  return out;
}

// Strict: only complete, in-range facts reach the server. The server
// re-validates; this just keeps half-filled editor rows out of the payload.
export function completeTastingEntries(rows: TastingDraftRow[]): TastingEntry[] {
  const out: TastingEntry[] = [];
  for (const r of rows) {
    if (!isTastingStage(r.stage)) continue;
    const attribute = normalizeAttribute(r.attribute);
    if (attribute === "" || attribute.length > 40) continue;
    const value = r.value === "" ? NaN : Number(r.value);
    if (!Number.isFinite(value) || value < TASTING_MIN || value > TASTING_MAX) continue;
    out.push({ stage: r.stage, attribute, value });
  }
  return out;
}

export function groupTastingsByStage(rows: TastingDraftRow[]): Record<TastingStage, TastingDraftRow[]> {
  const grouped: Record<TastingStage, TastingDraftRow[]> = { hot: [], warm: [], cold: [] };
  for (const r of rows) {
    if (isTastingStage(r.stage)) grouped[r.stage].push(r);
  }
  return grouped;
}

// Freshest server timestamp, so a stale local draft can never clobber synced rows.
export function tastingsUpdatedAt(rows: { updated_at?: unknown }[] | null | undefined): string | null {
  if (!rows) return null;
  let latest: string | null = null;
  for (const r of rows) {
    if (typeof r.updated_at === "string" && r.updated_at !== "" && (latest === null || r.updated_at > latest)) {
      latest = r.updated_at;
    }
  }
  return latest;
}

// Comparison matrix for two brews: per stage, the union of attributes in
// stable alphabetical order. Missing sides are null (rendered as "-"),
// never invented. changed flags values that differ or exist on one side only.
export type TastingComparisonRow = {
  attribute: string;
  a: number | null;
  b: number | null;
  changed: boolean;
};

export type TastingComparisonStage = {
  stage: TastingStage;
  rows: TastingComparisonRow[];
};

type TastingFact = { stage: unknown; attribute: unknown; value: unknown };

function factValue(v: unknown): number | null {
  const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function compareTastings(a: TastingFact[] | null | undefined, b: TastingFact[] | null | undefined): TastingComparisonStage[] {
  const out: TastingComparisonStage[] = [];
  for (const stage of TASTING_STAGES) {
    const values = new Map<string, { a: number | null; b: number | null }>();
    for (const [side, rows] of [["a", a], ["b", b]] as const) {
      for (const r of rows ?? []) {
        if (typeof r !== "object" || r === null) continue;
        if (r.stage !== stage) continue;
        const attribute = normalizeAttribute(r.attribute);
        if (attribute === "" || attribute.length > 40) continue;
        const value = factValue(r.value);
        if (value === null) continue;
        const slot = values.get(attribute) ?? { a: null, b: null };
        slot[side] = value;
        values.set(attribute, slot);
      }
    }
    if (values.size === 0) continue;
    const rows = [...values.entries()]
      .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
      .map(([attribute, v]) => ({ attribute, ...v, changed: v.a !== v.b }));
    out.push({ stage, rows });
  }
  return out;
}
