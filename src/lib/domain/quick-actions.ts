// ponytail: the copy-as-next-brew target lives here (pure, tested) so every
// quick action lands on the existing copy flow, never a new duplicate.
// A specific brewId copies that brew; otherwise fall back to the latest brew
// for the coffee (coffee-level "Brew again").
export function copyNextBrewHref(coffeeId: string, brewId?: string): string {
  if (brewId) return `/brews/new?brew=${encodeURIComponent(brewId)}&copy=1`;
  return `/brews/new?coffee=${encodeURIComponent(coffeeId)}&copy=1`;
}
