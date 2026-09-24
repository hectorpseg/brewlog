// ponytail: pure display helpers so old rows (all metadata null) render
// exactly as before. No inference, no formatting of values.
export type CoffeeMeta = {
  origin?: string | null;
  process?: string | null;
  variety?: string | null;
  producer?: string | null;
  country?: string | null;
  region?: string | null;
  farm?: string | null;
  altitude?: string | null;
};

function text(v: unknown): string {
  return typeof v === "string" && v.trim() !== "" ? v : "";
}

// Headline: unchanged legacy behavior.
export function coffeeMetaLine(c: CoffeeMeta): string {
  return [text(c.origin), text(c.process)].filter(Boolean).join(" · ") || "origin/process unknown";
}

// Detail line: null when no metadata is known, so old rows render nothing new.
export function coffeeDetailLine(c: CoffeeMeta): string | null {
  const parts = [
    text(c.variety),
    text(c.producer),
    text(c.country),
    text(c.region),
    text(c.farm),
    text(c.altitude),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
