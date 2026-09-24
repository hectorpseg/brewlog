import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatDuration } from "@/lib/domain/brew-time";
import { brewRatio } from "@/lib/domain/ratio";
import { TASTING_STAGES, isTastingStage, normalizeAttribute } from "@/lib/domain/tastings";

// ponytail: one canonical plain-text formatter for a brew. Deterministic,
// no IDs, no LLM — the same string feeds Copy summary and anything else
// that needs to describe a brew in words. Absent values are omitted,
// never invented.

export type SummaryTasting = { stage: unknown; attribute: unknown; value: unknown };
export type SummaryExperiment = { status: "open" | "answered" };

type SummaryInput = {
  brew: Record<string, unknown>;
  coffeeName?: string | null;
  sessionTitle?: string | null;
  observation?: Record<string, unknown> | null;
  tastings?: SummaryTasting[] | null;
  experiments?: SummaryExperiment[] | null;
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
  ["freeform_notes", "Overall"],
] as const;

export function formatBrewSummary(input: SummaryInput): string {
  const { brew, coffeeName, sessionTitle, observation, tastings, experiments } = input;
  const lines: string[] = [];

  const day = typeof brew.brewed_at === "string" && brew.brewed_at !== ""
    ? formatBrewDate(brew.brewed_at)
    : typeof brew.created_at === "string" && brew.created_at !== ""
      ? formatBrewDate(brew.created_at)
      : null;
  lines.push([coffeeName?.trim() || "Brew", day].filter(Boolean).join(" · "));

  const dose = num(brew.dose_g);
  const water = num(brew.water_g);
  const recipe: string[] = [];
  if (dose != null && water != null) {
    const ratio = brewRatio(dose, water);
    recipe.push(`${dose} g dose · ${water} g water${ratio == null ? "" : ` (1:${ratio})`}`);
  } else {
    if (dose != null) recipe.push(`${dose} g dose`);
    if (water != null) recipe.push(`${water} g water`);
  }
  const temp = num(brew.temp_c);
  if (temp != null) recipe.push(`${temp}°C`);
  const clicks = num(brew.grind_clicks);
  if (clicks != null) recipe.push(`${clicks} clicks`);
  for (const key of ["grinder", "dripper", "filter", "water_source"] as const) {
    const t = text(brew[key]);
    if (t) recipe.push(t);
  }
  const pours = num(brew.pour_count);
  if (pours != null) recipe.push(`${pours} pours`);
  const time = formatDuration(
    brew.total_time_sec != null && brew.total_time_sec !== "" ? Number(brew.total_time_sec) : null,
  );
  if (time) recipe.push(time);
  const beverage = num(brew.final_beverage_g);
  if (beverage != null) recipe.push(`${beverage} g out`);
  if (recipe.length > 0) lines.push(recipe.join(" · "));

  const session = sessionTitle?.trim() ? sessionTitle.trim() : null;
  if (session) lines.push(`Session: ${session}`);

  const perStage = new Map<string, string[]>();
  for (const r of tastings ?? []) {
    if (typeof r !== "object" || r === null) continue;
    if (!isTastingStage(r.stage)) continue;
    const attribute = normalizeAttribute(r.attribute);
    if (attribute === "" || attribute.length > 40) continue;
    const value = num(r.value);
    if (value == null) continue;
    const list = perStage.get(r.stage) ?? [];
    list.push(`${attribute} ${value}`);
    perStage.set(r.stage, list);
  }
  const tasted = TASTING_STAGES.filter((s) => (perStage.get(s) ?? []).length > 0)
    .map((s) => `${s[0].toUpperCase()}${s.slice(1)}: ${(perStage.get(s) ?? []).join(", ")}`);
  if (tasted.length > 0) lines.push(`Tasting — ${tasted.join("; ")}`);

  const obs = observation ?? {};
  for (const [key, label] of NOTE_LABELS) {
    const t = text(obs[key]);
    if (t) lines.push(`${label}: ${t}`);
  }
  const processNotes = text(brew.notes);
  if (processNotes) lines.push(`Brew notes: ${processNotes}`);

  const exps = experiments ?? [];
  if (exps.length > 0) {
    const answered = exps.filter((e) => e.status === "answered").length;
    lines.push(`Experiments: ${exps.length}${answered > 0 ? ` (${answered} answered)` : " (open)"}`);
  }

  return lines.join("\n");
}
