// ponytail: approximate grams, never block the user
export function remainingAfter(remainingG: number, doseG: number): number {
  return Math.round((remainingG - doseG) * 10) / 10;
}

// Inverse: deleting a brew hands its dose back. No upper clamp — the user may
// have corrected remaining manually, and inventory stays advisory.
export function restoredAfter(remainingG: number, doseG: number): number {
  return Math.round((remainingG + doseG) * 10) / 10;
}

export function exceedsRemaining(remainingG: number, doseG: number): boolean {
  return doseG > remainingG;
}

// Cupping edit delta in coffee-grams: positive hands coffee back, negative
// consumes more. Null/unknown doses count as zero; equal doses yield zero,
// so editing unrelated fields never moves inventory.
export function cuppingDoseDelta(
  oldDoseG: unknown,
  newDoseG: unknown,
): number {
  const old = typeof oldDoseG === "number" || typeof oldDoseG === "string" ? Number(oldDoseG) : NaN;
  const next = typeof newDoseG === "number" || typeof newDoseG === "string" ? Number(newDoseG) : NaN;
  return (Number.isFinite(old) ? old : 0) - (Number.isFinite(next) ? next : 0);
}

// Applies a delta to remaining stock. Clamped at zero like brew creation —
// advisory inventory never goes negative and never blocks the user.
export function applyInventoryDelta(remainingG: number, deltaG: number): number {
  return Math.max(0, Math.round((remainingG + deltaG) * 10) / 10);
}

// Depleted status is determined solely by remaining inventory. Unknown stock
// (null) is treated as available so it stays visible until the user weighs it.
export function isDepletedCoffee(remainingG: number | null | undefined): boolean {
  return remainingG === 0;
}

export type CoffeeOption = { id: string; name: string; remaining_weight_g: number | null };

// Group coffees for the brew-form selector: available choices first, depleted
// choices separated so they are never silent defaults. Null stock counts as
// available because the user has not marked it empty.
export function partitionCoffeesForBrewSelect(coffees: CoffeeOption[]): {
  available: CoffeeOption[];
  depleted: CoffeeOption[];
} {
  const available: CoffeeOption[] = [];
  const depleted: CoffeeOption[] = [];
  for (const c of coffees) {
    if (isDepletedCoffee(c.remaining_weight_g)) depleted.push(c);
    else available.push(c);
  }
  return { available, depleted };
}
