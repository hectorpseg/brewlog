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
