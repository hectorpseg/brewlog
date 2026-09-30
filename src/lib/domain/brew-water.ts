// ponytail: derived water/extraction figures live here, computed from facts
// only — nothing here is stored, nothing is fabricated. Every function reads
// null (unknown) and answers null rather than inventing a value.

import type { PourFact } from "./pours";

export type BrewWaterFacts = {
  // planned recipe water (brews.water_g)
  water_g?: unknown;
  // beverage mass (brews.final_beverage_g)
  final_beverage_g?: unknown;
  // brews.tds_percent: TDS measured on the final served beverage, incl. bypass
  tds_percent?: unknown;
  // brews.dose_g
  dose_g?: unknown;
  // brews.bypass_g: water that never contacted the coffee bed. Null/unknown
  // reads as 0 for derivations per product rule; the stored field stays unknown.
  bypass_g?: unknown;
};

function num(v: unknown): number | null {
  // "" coerces to 0 via Number(), which would fake "zero water" from a blank
  // field — empty always means unknown, per product rules.
  if (v === "" || v == null) return null;
  const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

// Actual water that contacted the coffee bed: the sum of pour amounts.
// Rows without a valid positive amount are skipped. Null when no pours exist
// (unknown, never approximated from planned water).
export function pouredTotalG(pours?: PourFact[] | null): number | null {
  if (!pours || pours.length === 0) return null;
  let total = 0;
  let counted = 0;
  for (const r of pours) {
    const a = num(r.amount_g);
    if (a == null || a <= 0 || a > 2000) continue;
    total += a;
    counted += 1;
  }
  return counted > 0 ? Math.round(total * 10) / 10 : null;
}

// Pour total minus planned water. Guidance-only: a difference is information,
// never an error. Null when either side is unknown.
export function plannedDeltaG(waterG: unknown, pours?: PourFact[] | null): number | null {
  const planned = num(waterG);
  const poured = pouredTotalG(pours);
  if (planned == null || poured == null) return null;
  return Math.round((poured - planned) * 10) / 10;
}

// Retention input: actual poured water when pours exist, planned water as the
// documented fallback (never mixes the two).
export function bedWaterG(waterG: unknown, pours?: PourFact[] | null): number | null {
  return pouredTotalG(pours) ?? num(waterG);
}

// Actual brew water when the poured total is already resolved as a scalar
// (list views, embedded pour rows): poured total when present, planned water
// otherwise. Null only when both are unknown.
export function actualWaterG(waterG: unknown, pouredTotal: unknown): number | null {
  const poured = num(pouredTotal);
  return poured != null && poured > 0 ? poured : num(waterG);
}

// Liquid the coffee bed held back: bed water minus the liquid that left it
// (beverage minus bypass). Unknown stays unknown.
export function retainedG(facts: BrewWaterFacts, pours?: PourFact[] | null): number | null {
  const bed = bedWaterG(facts.water_g, pours);
  const bev = num(facts.final_beverage_g);
  if (bed == null || bev == null) return null;
  const bypass = num(facts.bypass_g);
  return Math.round((bed - (bev - (bypass ?? 0))) * 10) / 10;
}

// Extraction yield from a beverage TDS reading. EY = TDS × (beverage mass / dose).
// Null unless TDS, beverage, and dose all exist — never fabricated.
export function eyPercent(facts: BrewWaterFacts): number | null {
  const tds = num(facts.tds_percent);
  const bev = num(facts.final_beverage_g);
  const dose = num(facts.dose_g);
  if (tds == null || bev == null || dose == null || dose <= 0) return null;
  return Math.round(((tds * bev) / dose) * 100) / 100;
}
