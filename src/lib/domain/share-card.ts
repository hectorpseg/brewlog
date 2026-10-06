import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { brewRatio } from "@/lib/domain/ratio";
import { eyPercent, pouredTotalG } from "@/lib/domain/brew-water";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewScore } from "@/lib/domain/brew-score";

// ponytail: privacy-safe recipe/result snapshot for the share card. Only the
// fields listed here ever reach the image or clipboard text: coffee identity,
// recipe parameters, derived score. Notes, observations, tastings detail,
// sessions, and IDs never enter this type by construction.

type Translator = (key: TranslationKey) => string;

export type ShareCardData = {
  coffeeName: string;
  ratio: string | null;
  recipeLines: string[];
  score: number | null;
  scoreLabel: string | null;
};

type ShareCardInput = {
  brew: Record<string, unknown>;
  coffeeName?: string | null;
  score?: number | null;
  // structured pours, when loaded: the ratio reflects actual poured water
  pours?: { amount_g?: unknown }[] | null;
};

function text(v: unknown, max = 48): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  if (t === "") return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

// Card-ready snapshot. Score is passed in (callers derive it with
// brewFinalScore); null omits it, never faked.
export function toShareCardData(input: ShareCardInput, t: Translator): ShareCardData {
  const { brew, coffeeName, score = null, pours } = input;
  const name = text(coffeeName, 80) ?? t("summary.brewFallback");
  const dose = num(brew.dose_g);
  const water = num(brew.water_g);
  // ratio reflects actual brew water: poured total when pours exist
  const poured = pouredTotalG(pours);
  const actual = poured ?? water;
  const ratio = dose != null && actual != null ? brewRatio(dose, actual) : null;

  const recipeLines: string[] = [];
  const recipe: string[] = [];
  if (dose != null) recipe.push(`${dose} g ${t("share.label.coffee")}`);
  if (poured != null && water != null && Math.abs(poured - water) >= 0.05) {
    recipe.push(`${poured} g ${t("summary.poured")} (${water} g ${t("summary.planned")})`);
  } else if (actual != null) {
    recipe.push(`${actual} g ${t("summary.water")}`);
  }
  if (recipe.length > 0) {
    recipeLines.push(ratio != null ? `${recipe.join(" · ")} (1:${ratio})` : recipe.join(" · "));
  }
  const temp = num(brew.temp_c);
  // brews.temp_c is the starting temperature; per-pour temps may differ
  if (temp != null) recipeLines.push(`${t("share.label.start")} ${temp}°C`);
  const clicks = num(brew.grind_clicks);
  if (clicks != null) recipeLines.push(`${t("share.label.grind")} ${clicks} ${t("brew.clicks")}`);
  for (const key of ["grinder", "dripper", "filter", "water_source"] as const) {
    const t2 = text(brew[key]);
    if (t2) recipeLines.push(t2);
  }
  const pourCount = num(brew.pour_count);
  if (pourCount != null) {
    recipeLines.push(`${pourCount} ${t(pourCount === 1 ? "summary.pourCountOne" : "summary.pourCountMany")}`);
  }
  const time = formatDuration(
    brew.total_time_sec != null && brew.total_time_sec !== "" ? Number(brew.total_time_sec) : null,
  );
  if (time) recipeLines.push(`${t("share.label.total")} ${time}`);
  const beverage = num(brew.final_beverage_g);
  if (beverage != null) recipeLines.push(`${beverage} g ${t("summary.out")}`);
  // extraction metrics via the shared water module; absent values are omitted
  const facts = {
    water_g: brew.water_g, final_beverage_g: brew.final_beverage_g,
    tds_percent: brew.tds_percent, dose_g: brew.dose_g, bypass_g: brew.bypass_g,
  };
  const ey = eyPercent(facts);
  const bypass = num(brew.bypass_g);
  if (brew.tds_percent != null) recipeLines.push(`${t("summary.tds")} ${brew.tds_percent}%`);
  if (ey != null) recipeLines.push(`${t("summary.ey")} ${ey}%`);
  if (bypass != null) recipeLines.push(`${bypass} g ${t("summary.bypass")}`);

  return {
    coffeeName: name,
    ratio: ratio != null ? `1:${ratio}` : null,
    recipeLines,
    score,
    scoreLabel: score === null ? null : formatBrewScore(score),
  };
}

// Clipboard fallback: same privacy-safe fields as the image, plain text.
export function formatShareCardText(card: ShareCardData, t: Translator): string {
  const lines = [card.coffeeName];
  if (card.ratio) lines.push(card.ratio);
  lines.push(...card.recipeLines);
  if (card.scoreLabel != null) lines.push(`${t("brew.scoreLabel")} ${card.scoreLabel} / 5`);
  lines.push("BrewLog");
  return lines.join("\n");
}

// PNG filename from the coffee name, filesystem-safe.
export function shareCardFilename(coffeeName: string): string {
  const slug = coffeeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `brewlog-${slug || "brew"}.png`;
}
