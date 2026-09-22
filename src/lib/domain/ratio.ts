// ponytail: pure functions, no deps
export function brewRatio(doseG: number, waterG: number): number | null {
  if (!Number.isFinite(doseG) || !Number.isFinite(waterG)) return null;
  if (doseG <= 0 || waterG <= 0) return null;
  return Math.round((waterG / doseG) * 10) / 10;
}

export function formatRatio(doseG: number, waterG: number): string {
  const r = brewRatio(doseG, waterG);
  return r == null ? "-" : `1:${r}`;
}
