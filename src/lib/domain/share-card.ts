import { brewRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewScore } from "@/lib/domain/brew-score";

// ponytail: privacy-safe recipe/result snapshot for the share card. Only the
// fields listed here ever reach the image or clipboard text: coffee identity,
// recipe parameters, derived score. Notes, observations, tastings detail,
// sessions, and IDs never enter this type by construction.

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
export function toShareCardData(input: ShareCardInput): ShareCardData {
  const { brew, coffeeName, score = null } = input;
  const name = text(coffeeName, 80) ?? "Brew";
  const dose = num(brew.dose_g);
  const water = num(brew.water_g);
  const ratio = dose != null && water != null ? brewRatio(dose, water) : null;

  const recipeLines: string[] = [];
  const recipe: string[] = [];
  if (dose != null) recipe.push(`${dose} g coffee`);
  if (water != null) recipe.push(`${water} g water`);
  if (recipe.length > 0) {
    recipeLines.push(ratio != null ? `${recipe.join(" · ")} (1:${ratio})` : recipe.join(" · "));
  }
  const temp = num(brew.temp_c);
  if (temp != null) recipeLines.push(`Water ${temp}°C`);
  const clicks = num(brew.grind_clicks);
  if (clicks != null) recipeLines.push(`Grind ${clicks} clicks`);
  for (const key of ["grinder", "dripper", "filter", "water_source"] as const) {
    const t = text(brew[key]);
    if (t) recipeLines.push(t);
  }
  const pourCount = num(brew.pour_count);
  if (pourCount != null) recipeLines.push(`${pourCount} pours`);
  const time = formatDuration(
    brew.total_time_sec != null && brew.total_time_sec !== "" ? Number(brew.total_time_sec) : null,
  );
  if (time) recipeLines.push(`Total ${time}`);
  const beverage = num(brew.final_beverage_g);
  if (beverage != null) recipeLines.push(`${beverage} g out`);

  return {
    coffeeName: name,
    ratio: ratio != null ? `1:${ratio}` : null,
    recipeLines,
    score,
    scoreLabel: score === null ? null : formatBrewScore(score),
  };
}

// Clipboard fallback: same privacy-safe fields as the image, plain text.
export function formatShareCardText(card: ShareCardData): string {
  const lines = [card.coffeeName];
  if (card.ratio) lines.push(card.ratio);
  lines.push(...card.recipeLines);
  if (card.scoreLabel != null) lines.push(`Score ${card.scoreLabel} / 5`);
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
