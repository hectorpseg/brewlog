import { formatBrewDate, formatReceived } from "./brew-date";
import { DICTIONARIES, type TranslationKey } from "@/lib/i18n/dictionaries";

// ponytail: pure display helpers so old rows (all metadata null) render
// exactly as before. No inference, no formatting of values. Optional translate
// localizes the fixed label fragments; the English default keeps every
// existing caller and test output unchanged.
const englishLabel = (k: TranslationKey): string => DICTIONARIES.en[k];

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
export function coffeeMetaLine(c: CoffeeMeta, translate: (k: TranslationKey) => string = englishLabel): string {
  return [text(c.origin), text(c.process)].filter(Boolean).join(" · ") || translate("coffee.metaUnknown");
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

// Coffee list date: prefer the user-entered received date, fall back to the
// audit timestamp when unknown. Label makes the source clear. Optional locale
// localizes the formatted day.
export function formatCoffeeListDate(
  receivedDate?: string | null,
  createdAt?: string | null,
  translate: (k: TranslationKey) => string = englishLabel,
  locale?: string,
): string {
  if (receivedDate != null && receivedDate !== "") {
    return `${translate("coffee.receivedPrefix")} ${formatReceived(receivedDate, locale)}`;
  }
  return `${translate("coffee.addedPrefix")} ${formatBrewDate(createdAt, locale)}`;
}
