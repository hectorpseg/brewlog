import { describe, expect, it } from "vitest";
import { createTranslator } from "@/lib/i18n/translate";
import { brewFinalScore } from "@/lib/domain/brew-score";
import { formatBrewSummary } from "@/lib/domain/brew-summary";

const en = createTranslator("en");
const es = createTranslator("es");

const baseBrew = {
  id: "b1",
  user_id: "u1",
  coffee_id: "c1",
  dose_g: 15,
  water_g: 250,
  brewed_at: "2026-09-21T12:00:00.000Z",
  created_at: "2026-09-21T12:00:00.000Z",
  temp_c: 92,
  grind_clicks: 70,
  grinder: "K-Ultra",
  dripper: "Origami",
  filter: "Abaca",
  water_source: "Scala",
  pour_count: 4,
  total_time_sec: 150,
  final_beverage_g: 90,
  notes: "good",
  session_id: "s1",
};

const observation = {
  hot_notes: "Sweet, bright.",
  warm_notes: null,
  cold_notes: "Clean.",
  freeform_notes: "Best cup this week.",
};

const tastings = [
  { stage: "hot", attribute: "Body", value: 4 },
  { stage: "hot", attribute: "finish", value: 2 },
  { stage: "warm", attribute: "sweetness", value: 8 },
];

const fullPours = [
  { sequence: 1, amount_g: 50, timing_seconds: 0, bloom: true, pattern: "center", note: null, temp_c: null, melodrip: false, switch_state: null, pulse_min: null, pulse_max: null },
  { sequence: 2, amount_g: 200, timing_seconds: 45, bloom: false, pattern: "circular", note: "slow spiral", temp_c: 90, melodrip: true, switch_state: "open", pulse_min: 4.5, pulse_max: null },
];

const fullBrew = {
  ...baseBrew,
  water_brand: "Third Wave Water",
  water_ppm: 120,
  water_description: "mineral profile",
  water_notes: "Soft, slightly sweet.",
  selected_beans: true,
  lilydrip: true,
  melodrip: true,
  hario_switch: true,
  thermal_shock: "no thermal shock",
  bypass: "bypass after bloom",
  bypass_g: 5,
  tds_percent: 1.3,
  expected_text: "Brighter acidity",
};

describe("formatBrewSummary", () => {
  it("renders the full canonical deterministic summary", () => {
    const text = formatBrewSummary(
      {
        brew: fullBrew,
        coffeeName: "Competencia",
        sessionTitle: "Phase 1",
        observation,
        tastings,
        pours: fullPours,
        score: brewFinalScore(tastings),
      },
      en,
    );
    expect(text).toBe(
      [
        "Competencia · Sep 21",
        "Session: Phase 1",
        "15 g dose · 250 g water (1:16.7) · start 92°C · 70 clicks · K-Ultra · Origami · Abaca",
        "Water: Scala · Third Wave Water · 120 ppm · mineral profile",
        "Technique: Selected beans · LilyDrip · MeloDrip · Hario Switch · Thermal shock: no thermal shock · Bypass: bypass after bloom",
        "Brew: 2:30 · 4 pours · 90 g out · 1.3% TDS · EY 7.8% · 5 g bypass · 165 g retained",
        "Expected: Brighter acidity",
        "Pours:",
        "1. 0:00 · 50 g · Center · Bloom",
        "2. 0:45 · 200 g · Circular · 90°C · MeloDrip · Switch Open · 4.5 g/s · slow spiral",
        "Tasting — Hot: body 4, finish 2; Warm: sweetness 8",
        "Score: 2.3 / 5",
        "Hot notes: Sweet, bright.",
        "Cold notes: Clean.",
        "Overall: Best cup this week.",
        "Water notes: Soft, slightly sweet.",
        "Brew notes: good",
      ].join("\n"),
    );
    // same input twice, same string — no randomness, no timestamps
    expect(formatBrewSummary(
      {
        brew: fullBrew,
        coffeeName: "Competencia",
        sessionTitle: "Phase 1",
        observation,
        tastings,
        pours: fullPours,
        score: brewFinalScore(tastings),
      },
      en,
    )).toBe(text);
  });

  it("omits absent values and never leaks database IDs", () => {
    const text = formatBrewSummary({ brew: { dose_g: 15, water_g: 250 } }, en);
    expect(text).toBe("Brew\n15 g dose · 250 g water (1:16.7)");
    expect(text).not.toContain("b1");
    expect(text).not.toContain("u1");
  });

  it("groups water source, brand, ppm and description in one Water line", () => {
    const text = formatBrewSummary(
      { brew: { ...fullBrew, water_source: null, water_brand: "Aqua" }, coffeeName: "Test" },
      en,
    );
    expect(text).toContain("Water: Aqua · 120 ppm · mineral profile");
  });

  it("includes technique flags and expected details when recorded", () => {
    const text = formatBrewSummary({ brew: fullBrew, coffeeName: "Test" }, en);
    expect(text).toContain("Technique: Selected beans · LilyDrip · MeloDrip · Hario Switch · Thermal shock: no thermal shock · Bypass: bypass after bloom");
    expect(text).toContain("Expected: Brighter acidity");
  });

  it("omits technique, expected and water details that were never recorded", () => {
    const text = formatBrewSummary({ brew: baseBrew, observation, tastings }, en);
    // water_source is present, so the Water line shows only that — never invented ppm/brand
    expect(text).toContain("Water: Scala");
    expect(text).not.toContain("120 ppm");
    expect(text).not.toContain("Technique:");
    expect(text).not.toContain("LilyDrip");
    expect(text).not.toContain("MeloDrip");
    expect(text).not.toContain("Hario Switch");
    expect(text).not.toContain("Expected:");
  });

  it("renders structured pours as a multi-line section with localized pattern labels", () => {
    const text = formatBrewSummary(
      { brew: baseBrew, coffeeName: "Competencia", pours: fullPours },
      en,
    );
    expect(text).toContain("Pours:\n1. 0:00 · 50 g · Center · Bloom\n2. 0:45 · 200 g · Circular · 90°C · MeloDrip · Switch Open · 4.5 g/s · slow spiral");
  });

  it("pluralizes the pour count", () => {
    expect(formatBrewSummary({ brew: { ...baseBrew, pour_count: 1 } }, en)).toContain("1 pour");
    expect(formatBrewSummary({ brew: { ...baseBrew, pour_count: 4 } }, en)).toContain("4 pours");
  });

  it("omits the pours section for historical brews without structured pours", () => {
    expect(formatBrewSummary({ brew: baseBrew }, en)).not.toContain("Pours:");
    expect(formatBrewSummary({ brew: baseBrew, pours: [] }, en)).not.toContain("Pours:");
    expect(formatBrewSummary({ brew: baseBrew, pours: [{ sequence: 1 }] }, en)).not.toContain("Pours:");
  });

  it("orders tastings deterministically regardless of input order", () => {
    const shuffled = [
      { stage: "warm", attribute: "sweetness", value: 8 },
      { stage: "hot", attribute: "finish", value: 2 },
      { stage: "hot", attribute: "body", value: 4 },
    ];
    const text = formatBrewSummary({ brew: baseBrew, tastings: shuffled }, en);
    expect(text).toContain("Tasting — Hot: body 4, finish 2; Warm: sweetness 8");
    expect(formatBrewSummary({ brew: baseBrew, tastings: [...shuffled].reverse() }, en)).toBe(text);
  });

  it("skips garbage tasting rows", () => {
    const text = formatBrewSummary(
      { brew: baseBrew, tastings: [
        { stage: "lukewarm", attribute: "x", value: 5 },
        { stage: "hot", attribute: "", value: 5 },
        { stage: "hot", attribute: "ok", value: "lots" },
      ] },
      en,
    );
    expect(text).not.toContain("Tasting");
  });

  it("never emits an experiments line", () => {
    const text = formatBrewSummary({ brew: baseBrew, observation, tastings }, en);
    expect(text).not.toContain("Experiments");
  });

  it("includes the score when provided, never fakes one", () => {
    const scored = formatBrewSummary({ brew: baseBrew, score: brewFinalScore(tastings) }, en);
    expect(scored).toContain("Score: 2.3 / 5");
    const unscored = formatBrewSummary({ brew: baseBrew }, en);
    expect(unscored).not.toContain("Score:");
  });

  it("carries per-pour MeloDrip and Switch state in pour order", () => {
    const text = formatBrewSummary(
      {
        brew: baseBrew,
        pours: [
          { sequence: 2, amount_g: 60, timing_seconds: 45, bloom: false, pattern: "circular", melodrip: true, switch_state: "open" },
          { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", melodrip: false, switch_state: null },
        ],
      },
      en,
    );
    expect(text).toContain("Pours:\n1. 0:00 · 40 g · Center · Bloom\n2. 0:45 · 60 g · Circular · MeloDrip · Switch Open");
  });

  it("localizes the summary into Spanish", () => {
    const text = formatBrewSummary(
      {
        brew: fullBrew,
        coffeeName: "Competencia",
        sessionTitle: "Fase 1",
        observation,
        tastings,
        pours: fullPours,
        score: brewFinalScore(tastings),
      },
      es,
      "es",
    );
    expect(text).toBe(
      [
        "Competencia · 21 sept",
        "Sesión: Fase 1",
        "15 g dosis · 250 g agua (1:16.7) · inicio 92°C · 70 clics · K-Ultra · Origami · Abaca",
        "Agua: Scala · Third Wave Water · 120 ppm · mineral profile",
        "Técnica: Selección de granos · LilyDrip · MeloDrip · Hario Switch · Choque térmico: no thermal shock · Bypass: bypass after bloom",
        "Extracción: 2:30 · 4 vertidos · 90 g salida · 1.3% TDS · EY 7.8% · 5 g bypass · 165 g retenido",
        "Esperado: Brighter acidity",
        "Vertidos:",
        "1. 0:00 · 50 g · Centro · Bloom",
        "2. 0:45 · 200 g · Circular · 90°C · MeloDrip · Switch Abierto · 4.5 g/s · slow spiral",
        "Cata — Caliente: body 4, finish 2; Tibio: sweetness 8",
        "Puntuación: 2.3 / 5",
        "Notas en caliente: Sweet, bright.",
        "Notas en frío: Clean.",
        "General: Best cup this week.",
        "Notas del agua: Soft, slightly sweet.",
        "Notas de la extracción: good",
      ].join("\n"),
    );
  });
});
