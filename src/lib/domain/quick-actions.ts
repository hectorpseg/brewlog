// ponytail: the copy-as-next-brew target lives here (pure, tested) so every
// quick action lands on the existing copy flow, never a new duplicate.
export function copyNextBrewHref(coffeeId: string): string {
  return `/brews/new?coffee=${encodeURIComponent(coffeeId)}&copy=1`;
}
