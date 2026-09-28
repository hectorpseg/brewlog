// ponytail: the final brew score is derived, never entered. One pure function
// over persisted tasting values: mean(values) / 2, null when nothing was
// entered. Attribute names (including custom ones) never participate — every
// entered value counts once, missing values never count as zero, and legacy
// text observations are excluded by construction (callers pass tasting rows
// or values only, never observation text).

// A single entered tasting value: a bare number/numeric string (list display
// path) or a persisted row object with a value field (listTastings path).
function toFiniteValue(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && v !== null && "value" in v) {
    return toFiniteValue((v as { value: unknown }).value);
  }
  return null;
}

// Locked Q1 formula: average of entered values, divided by 2 (1-10 in,
// 0.5-5 out). Full precision; display rounding lives in formatBrewScore.
export function brewFinalScore(values: unknown): number | null {
  if (!Array.isArray(values)) return null;
  let sum = 0;
  let count = 0;
  for (const v of values) {
    const n = toFiniteValue(v);
    if (n === null) continue;
    sum += n;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count / 2;
}

export const NO_SCORE_LABEL = "No score available";

// Display only: one decimal. Null renders the locked empty copy, never a
// fake rating (share card omits the score on null — it never formats one).
export function formatBrewScore(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return NO_SCORE_LABEL;
  return score.toFixed(1);
}

// Display only: nearest half star for star rendering (4.25 -> 4.5).
export function starsForScore(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) return null;
  return Math.round(score * 2) / 2;
}
