import { formatBrewDate } from "@/lib/domain/brew-date";
import { brewRatio } from "@/lib/domain/ratio";

// ponytail: one canonical plain-text formatter for a cupping. Deterministic,
// no IDs, no LLM - the same string feeds per-cupping Copy actions. Absent
// values are omitted, never invented. Only stored cupping fields appear:
// dose/water/grind prep plus the hot/warm/cold + final-take notes. Cuppings
// carry no structured tasting rows, so none are rendered here.

type CuppingInput = {
  cupping: Record<string, unknown>;
  coffeeName?: string | null;
};

function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

const NOTE_LABELS = [
  ["hot_notes", "Hot notes"],
  ["warm_notes", "Warm notes"],
  ["cold_notes", "Cold notes"],
  ["notes", "Final take"],
] as const;

export function formatCuppingSummary(input: CuppingInput): string {
  const { cupping, coffeeName } = input;
  const lines: string[] = [];

  const day = typeof cupping.cupped_at === "string" && cupping.cupped_at !== ""
    ? formatBrewDate(cupping.cupped_at)
    : typeof cupping.created_at === "string" && cupping.created_at !== ""
      ? formatBrewDate(cupping.created_at)
      : null;
  lines.push([coffeeName?.trim() || "Cupping", day].filter(Boolean).join(" · "));

  const dose = num(cupping.dose_g);
  const water = num(cupping.water_g);
  const prep: string[] = [];
  if (dose != null && water != null) {
    const ratio = brewRatio(dose, water);
    prep.push(`${dose} g dose · ${water} g water${ratio == null ? "" : ` (1:${ratio})`}`);
  } else {
    if (dose != null) prep.push(`${dose} g dose`);
    if (water != null) prep.push(`${water} g water`);
  }
  const grinder = text(cupping.grinder);
  if (grinder) prep.push(grinder);
  const clicks = num(cupping.grind_clicks);
  if (clicks != null) prep.push(`${clicks} clicks`);
  const grind = text(cupping.grind);
  if (grind) prep.push(grind);
  if (prep.length > 0) lines.push(prep.join(" · "));

  for (const [key, label] of NOTE_LABELS) {
    const t = text(cupping[key]);
    if (t) lines.push(`${label}: ${t}`);
  }

  return lines.join("\n");
}
