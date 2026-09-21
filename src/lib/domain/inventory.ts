// ponytail: approximate grams, never block the user
export function remainingAfter(remainingG: number, doseG: number): number {
  return Math.round((remainingG - doseG) * 10) / 10;
}

export function exceedsRemaining(remainingG: number, doseG: number): boolean {
  return doseG > remainingG;
}
