import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "@/lib/i18n/translate";
import {
  formatShareCardText,
  shareCardFilename,
  toShareCardData,
} from "@/lib/domain/share-card";
import { brewFinalScore } from "@/lib/domain/brew-score";
import { drawShareCard } from "@/lib/share/share-card";

const en = createTranslator("en");
const es = createTranslator("es");

describe("toShareCardData", () => {
  it("includes identity, recipe, and score for a scored brew", () => {
    const score = brewFinalScore([{ value: 8 }, { value: 9 }]);
    const card = toShareCardData({
      brew: {
        dose_g: 15, water_g: 250, temp_c: 93, grind_clicks: 18,
        dripper: "Origami", total_time_sec: 150, final_beverage_g: 220,
      },
      coffeeName: "Ethiopia Guji",
      score,
    }, en);
    expect(card.coffeeName).toBe("Ethiopia Guji");
    expect(card.ratio).toBe("1:16.7");
    expect(card.scoreLabel).toBe("4.3");
    expect(card.recipeLines.join(" ")).toContain("Origami");
  });

  it("omits the score for an unscored brew, never fakes one", () => {
    const card = toShareCardData({ brew: { dose_g: 15, water_g: 250 }, coffeeName: "Kenya", score: null }, en);
    expect(card.score).toBeNull();
    expect(card.scoreLabel).toBeNull();
    expect(formatShareCardText(card, en)).not.toContain(en("brew.scoreLabel"));
  });

  it("truncates a long coffee name instead of overflowing", () => {
    const card = toShareCardData({ brew: {}, coffeeName: `${"A".repeat(200)} roast`, score: null }, en);
    expect(card.coffeeName.length).toBeLessThanOrEqual(80);
    expect(card.coffeeName).toMatch(/…$/);
  });

  it("omits missing optional fields without inventing values", () => {
    const card = toShareCardData({ brew: {}, coffeeName: null, score: null }, en);
    expect(card.coffeeName).toBe(en("summary.brewFallback"));
    expect(card.ratio).toBeNull();
    expect(card.recipeLines).toEqual([]);
  });

  it("truncates long recipe values", () => {
    const card = toShareCardData({
      brew: { grinder: `${"x".repeat(100)} grinder`, water_source: "  Third  wave   water  " },
      coffeeName: "Test",
      score: null,
    }, en);
    for (const line of card.recipeLines) expect(line.length).toBeLessThanOrEqual(48);
    expect(card.recipeLines.some((l) => l.includes("Third wave water"))).toBe(true);
  });

  it("never leaks notes, observations, or tastings into the card", () => {
    const card = toShareCardData({
      brew: { dose_g: 15, water_g: 250, notes: "secret diarrea recipe", id: "abc", user_id: "u1" },
      coffeeName: "Secret",
      score: null,
    }, en);
    const blob = JSON.stringify(card);
    expect(blob).not.toContain("secret");
    expect(blob).not.toContain("user_id");
    const text = formatShareCardText(card, en);
    expect(text).not.toContain("secret");
  });
});

describe("formatShareCardText", () => {
  it("renders the compact English share text", () => {
    const card = toShareCardData({
      brew: {
        dose_g: 15, water_g: 250, temp_c: 93, grind_clicks: 18,
        dripper: "Origami", total_time_sec: 150, final_beverage_g: 220,
        tds_percent: 1.3,
      },
      coffeeName: "Ethiopia Guji",
      score: brewFinalScore([{ value: 8 }, { value: 9 }]),
    }, en);
    const text = formatShareCardText(card, en);
    expect(text).toBe([
      "Ethiopia Guji",
      "1:16.7",
      "15 g coffee · 250 g water (1:16.7)",
      "Start 93°C",
      "Grind 18 clicks",
      "Origami",
      "Total 2:30",
      "220 g out",
      "TDS 1.3%",
      "EY 19.07%",
      "Score 4.3 / 5",
      "BrewLog",
    ].join("\n"));
  });

  it("renders the compact Spanish share text", () => {
    const card = toShareCardData({
      brew: {
        dose_g: 15, water_g: 250, temp_c: 93, grind_clicks: 18,
        dripper: "Origami", total_time_sec: 150, final_beverage_g: 220,
        tds_percent: 1.3,
      },
      coffeeName: "Ethiopia Guji",
      score: brewFinalScore([{ value: 8 }, { value: 9 }]),
    }, es);
    const text = formatShareCardText(card, es);
    expect(text).toBe([
      "Ethiopia Guji",
      "1:16.7",
      "15 g café · 250 g agua (1:16.7)",
      "Inicio 93°C",
      "Molienda 18 clics",
      "Origami",
      "Total 2:30",
      "220 g salida",
      "TDS 1.3%",
      "EY 19.07%",
      "Puntuación 4.3 / 5",
      "BrewLog",
    ].join("\n"));
  });

  it("contains no hardcoded English application labels in Spanish output", () => {
    const card = toShareCardData({
      brew: {
        dose_g: 15, water_g: 250, temp_c: 93, grind_clicks: 18,
        grinder: "K-Ultra", dripper: "Origami", filter: "Abaca", water_source: "Scala",
        pour_count: 4, total_time_sec: 150, final_beverage_g: 220,
        tds_percent: 1.3, bypass_g: 5,
      },
      coffeeName: "Ethiopia Guji",
      score: brewFinalScore([{ value: 8 }, { value: 9 }]),
    }, es);
    const text = formatShareCardText(card, es);
    // User-entered values must remain untouched.
    expect(text).toContain("Ethiopia Guji");
    expect(text).toContain("K-Ultra");
    expect(text).toContain("Origami");
    expect(text).toContain("Abaca");
    expect(text).toContain("Scala");
    // English-only application labels must not appear.
    expect(text).not.toContain("coffee");
    expect(text).not.toContain("Start ");
    expect(text).not.toContain("Grind ");
    expect(text).not.toContain(" clicks");
    expect(text).not.toContain(" pours");
    expect(text).not.toContain(" g out");
    expect(text).not.toContain("Score ");
    // Spanish labels are present.
    expect(text).toContain("15 g café");
    expect(text).toContain("Inicio 93°C");
    expect(text).toContain("Molienda 18 clics");
    expect(text).toContain("4 vertidos");
    expect(text).toContain("220 g salida");
    expect(text).toContain("EY 19.07%");
    expect(text).toContain("5 g bypass");
    expect(text).toContain("Puntuación 4.3 / 5");
  });

  it("ends with BrewLog branding and includes the score line when scored", () => {
    const text = formatShareCardText({
      coffeeName: "Ethiopia", ratio: "1:16", recipeLines: ["15 g coffee"], score: 4.5, scoreLabel: "4.5",
    }, en);
    expect(text).toContain("Score 4.5 / 5");
    expect(text.endsWith("BrewLog")).toBe(true);
  });
});

describe("shareCardFilename", () => {
  it("slugifies the coffee name and falls back for empty names", () => {
    expect(shareCardFilename("Ethiopia Guji! Lot #5")).toBe("brewlog-ethiopia-guji-lot-5.png");
    expect(shareCardFilename("!!!")).toBe("brewlog-brew.png");
  });
});

function stubCtx() {
  return {
    fillRect: vi.fn(), fillText: vi.fn(), measureText: vi.fn(() => ({ width: 10 })),
    beginPath: vi.fn(), moveTo: vi.fn(), arcTo: vi.fn(), closePath: vi.fn(),
    lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("drawShareCard", () => {
  it("renders scored and unscored cards without throwing", () => {
    const scored = toShareCardData({
      brew: { dose_g: 15, water_g: 250, temp_c: 93 },
      coffeeName: "A very long coffee name ".repeat(10),
      score: 4.25,
    }, en);
    expect(() => drawShareCard(stubCtx(), scored)).not.toThrow();
    const unscored = toShareCardData({ brew: {}, coffeeName: "Plain", score: null }, en);
    const ctx = stubCtx();
    expect(() => drawShareCard(ctx, unscored)).not.toThrow();
    // Unscored card never draws a star/score glyph.
    const drawn = (ctx.fillText as unknown as { mock: { calls: string[][] } }).mock.calls.flat().join(" ");
    expect(drawn).not.toContain("★");
  });
});
