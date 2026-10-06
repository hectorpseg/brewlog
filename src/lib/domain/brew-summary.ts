import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatDuration } from "@/lib/domain/brew-time";
import { brewRatio } from "@/lib/domain/ratio";
import { eyPercent, pouredTotalG, retainedG } from "@/lib/domain/brew-water";
import { TASTING_STAGES, isTastingStage, normalizeAttribute } from "@/lib/domain/tastings";
import { isPourPattern } from "@/lib/domain/pours";

// ponytail: one canonical plain-text formatter for a brew. Deterministic,
// no IDs, no LLM — the same string feeds Copy summary and anything else
// that needs to describe a brew in words. Absent values are omitted,
// never invented. Wording comes from the passed translator so the output
// matches the application's current language; stored data is untouched.

export type SummaryTasting = { stage: unknown; attribute: unknown; value: unknown };
export type SummaryPour = {
  sequence?: unknown; amount_g?: unknown; timing_seconds?: unknown;
  bloom?: unknown; pattern?: unknown; note?: unknown;
  temp_c?: unknown; melodrip?: unknown; switch_state?: unknown;
};
type Translator = (key: TranslationKey) => string;
type SummaryInput = {
  brew: Record<string, unknown>;
  coffeeName?: string | null;
  sessionTitle?: string | null;
  observation?: Record<string, unknown> | null;
  tastings?: SummaryTasting[] | null;
  pours?: SummaryPour[] | null;
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

function noteLabels(t: Translator): [string, string][] {
  return [
    ["hot_notes", t("tasting.notes.hot")],
    ["warm_notes", t("tasting.notes.warm")],
    ["cold_notes", t("tasting.notes.cold")],
    ["freeform_notes", t("summary.overall")],
  ];
}

export function formatBrewSummary(input: SummaryInput, t: Translator, locale?: string): string {
  const { brew, coffeeName, sessionTitle, observation, tastings, pours } = input;
  const lines: string[] = [];

  const day = typeof brew.brewed_at === "string" && brew.brewed_at !== ""
    ? formatBrewDate(brew.brewed_at, locale)
    : typeof brew.created_at === "string" && brew.created_at !== ""
      ? formatBrewDate(brew.created_at, locale)
      : null;
  lines.push([coffeeName?.trim() || t("summary.brewFallback"), day].filter(Boolean).join(" · "));

  const dose = num(brew.dose_g);
  const water = num(brew.water_g);
  // ratio reflects actual brew water: the poured total when structured pours
  // exist, planned water otherwise. Planned stays explicit when the two differ.
  const poured = pouredTotalG(pours);
  const actual = poured ?? water;
  const recipe: string[] = [];
  if (dose != null && actual != null) {
    const ratio = brewRatio(dose, actual);
    const r = ratio == null ? "" : ` (1:${ratio})`;
    if (poured != null && water != null && Math.abs(poured - water) >= 0.05) {
      recipe.push(`${dose} g ${t("summary.dose")} · ${poured} g ${t("summary.poured")} (${water} g ${t("summary.planned")})${r}`);
    } else {
      recipe.push(`${dose} g ${t("summary.dose")} · ${actual} g ${t("summary.water")}${r}`);
    }
  } else {
    if (dose != null) recipe.push(`${dose} g ${t("summary.dose")}`);
    if (water != null) recipe.push(`${water} g ${t("summary.water")}`);
  }
  const temp = num(brew.temp_c);
  // brews.temp_c is the starting temperature (named as such since per-pour
  // temperatures may differ); pour segments carry their own actual temps
  if (temp != null) recipe.push(`${t("brew.start")} ${temp}°C`);
  const clicks = num(brew.grind_clicks);
  if (clicks != null) recipe.push(`${clicks} ${t("brew.clicks")}`);
  for (const key of ["grinder", "dripper", "filter", "water_source"] as const) {
    const t2 = text(brew[key]);
    if (t2) recipe.push(t2);
  }
  // water enrichment (0017): brand, metered ppm, free-text description
  const waterBrand = text(brew.water_brand);
  if (waterBrand) recipe.push(waterBrand);
  const ppm = num(brew.water_ppm);
  if (ppm != null) recipe.push(`${ppm} ppm`);
  const waterDescription = text(brew.water_description);
  if (waterDescription) recipe.push(waterDescription);
  // technique tools & treatment (0017/0018), only when actually recorded
  if (brew.lilydrip === true) recipe.push("LilyDrip");
  if (brew.melodrip === true) recipe.push("MeloDrip");
  if (brew.hario_switch === true) recipe.push("Hario Switch");
  const thermalShock = text(brew.thermal_shock);
  if (thermalShock) recipe.push(thermalShock);
  const pourCount = num(brew.pour_count);
  if (pourCount != null) {
    recipe.push(`${pourCount} ${t(pourCount === 1 ? "summary.pourCountOne" : "summary.pourCountMany")}`);
  }
  const time = formatDuration(
    brew.total_time_sec != null && brew.total_time_sec !== "" ? Number(brew.total_time_sec) : null,
  );
  if (time) recipe.push(time);
  const beverage = num(brew.final_beverage_g);
  if (beverage != null) recipe.push(`${beverage} g ${t("summary.out")}`);
  // extraction metrics, derived via the shared water module; missing inputs
  // omit the fragment entirely
  const facts = {
    water_g: brew.water_g, final_beverage_g: brew.final_beverage_g,
    tds_percent: brew.tds_percent, dose_g: brew.dose_g, bypass_g: brew.bypass_g,
  };
  const ey = eyPercent(facts);
  const bypass = num(brew.bypass_g);
  const retained = retainedG(facts, pours);
  if (brew.tds_percent != null) recipe.push(`${brew.tds_percent}% ${t("summary.tds")}`);
  if (ey != null) recipe.push(`${t("summary.ey")} ${ey}%`);
  if (bypass != null) recipe.push(`${bypass} g ${t("summary.bypass")}`);
  if (retained != null) recipe.push(`${retained} g ${t("summary.retained")}`);
  if (recipe.length > 0) lines.push(recipe.join(" · "));

  const session = sessionTitle?.trim() ? sessionTitle.trim() : null;
  if (session) lines.push(`${t("summary.session")}: ${session}`);
  const expected = text(brew.expected_text);
  if (expected) lines.push(`${t("summary.expected")}: ${expected}`);

  const perStage = new Map<string, string[]>();
  // Deterministic regardless of input order: stage in canonical Hot/Warm/Cold
  // order (enforced below via TASTING_STAGES), attributes alphabetical.
  const orderedTastings = [...(tastings ?? [])].sort((x, y) => {
    const stageOf = (r: SummaryTasting) =>
      typeof r === "object" && r !== null && isTastingStage((r as { stage: unknown }).stage)
        ? TASTING_STAGES.indexOf((r as { stage: (typeof TASTING_STAGES)[number] }).stage)
        : TASTING_STAGES.length;
    const attrOf = (r: SummaryTasting) =>
      typeof r === "object" && r !== null ? normalizeAttribute((r as { attribute: unknown }).attribute) : "";
    return stageOf(x) - stageOf(y) || (attrOf(x) < attrOf(y) ? -1 : attrOf(x) > attrOf(y) ? 1 : 0);
  });
  for (const r of orderedTastings) {
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
    .map((s) => `${t(`tasting.stage.${s}`)}: ${(perStage.get(s) ?? []).join(", ")}`);
  if (tasted.length > 0) lines.push(`${t("summary.tasting")} — ${tasted.join("; ")}`);

  // Structured pours in sequence order, one segment per pour. Brews without
  // pours (all historical rows) skip this line entirely, never invented.
  const segments: string[] = [];
  const ordered = [...(pours ?? [])]
    .filter((r): r is SummaryPour => typeof r === "object" && r !== null)
    .sort((x, y) => Number(x.sequence ?? 0) - Number(y.sequence ?? 0));
  for (const r of ordered) {
    const amount = num(r.amount_g);
    const when = formatDuration(
      r.timing_seconds != null && r.timing_seconds !== "" ? Number(r.timing_seconds) : null,
    );
    if (amount == null || when == null) continue;
    if (!isPourPattern(r.pattern)) continue;
    const parts = [`${when}`, `${amount} g`, r.pattern];
    // per-pour actual temperature, recorded per pour
    const pourTemp = num(r.temp_c);
    if (pourTemp != null) parts.push(`${pourTemp}°C`);
    if (r.bloom === true) parts.push(t("pour.bloom"));
    if (r.melodrip === true) parts.push("MeloDrip");
    if (r.switch_state === "open" || r.switch_state === "closed") {
      parts.push(`${t("summary.switch")} ${t(`pour.switch.${r.switch_state}`)}`);
    }
    const note = text(r.note)?.replace(/\s+/g, " ");
    if (note) parts.push(note);
    segments.push(`${Number(r.sequence) || segments.length + 1}. ${parts.join(" · ")}`);
  }
  if (segments.length > 0) lines.push(`${t("summary.pours")}: ${segments.join("; ")}`);

  const obs = observation ?? {};
  for (const [key, label] of noteLabels(t)) {
    const t2 = text(obs[key]);
    if (t2) lines.push(`${label}: ${t2}`);
  }
  const waterNotes = text(brew.water_notes);
  if (waterNotes) lines.push(`${t("summary.waterNotes")}: ${waterNotes}`);
  const processNotes = text(brew.notes);
  if (processNotes) lines.push(`${t("summary.brewNotes")}: ${processNotes}`);

  return lines.join("\n");
}
