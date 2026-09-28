import { describe, expect, it, vi } from "vitest";
import {
  formatShareCardText,
  shareCardFilename,
  toShareCardData,
} from "@/lib/domain/share-card";
import { brewFinalScore } from "@/lib/domain/brew-score";
import { drawShareCard } from "@/lib/share/share-card";

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
    });
    expect(card.coffeeName).toBe("Ethiopia Guji");
    expect(card.ratio).toBe("1:16.7");
    expect(card.scoreLabel).toBe("4.3");
    expect(card.recipeLines.join(" ")).toContain("Origami");
  });

  it("omits the score for an unscored brew, never fakes one", () => {
    const card = toShareCardData({ brew: { dose_g: 15, water_g: 250 }, coffeeName: "Kenya", score: null });
    expect(card.score).toBeNull();
    expect(card.scoreLabel).toBeNull();
    expect(formatShareCardText(card)).not.toContain("Score");
  });

  it("truncates a long coffee name instead of overflowing", () => {
    const card = toShareCardData({ brew: {}, coffeeName: `${"A".repeat(200)} roast`, score: null });
    expect(card.coffeeName.length).toBeLessThanOrEqual(80);
    expect(card.coffeeName).toMatch(/…$/);
  });

  it("omits missing optional fields without inventing values", () => {
    const card = toShareCardData({ brew: {}, coffeeName: null, score: null });
    expect(card.coffeeName).toBe("Brew");
    expect(card.ratio).toBeNull();
    expect(card.recipeLines).toEqual([]);
  });

  it("truncates long recipe values", () => {
    const card = toShareCardData({
      brew: { grinder: `${"x".repeat(100)} grinder`, water_source: "  Third  wave   water  " },
      coffeeName: "Test",
      score: null,
    });
    for (const line of card.recipeLines) expect(line.length).toBeLessThanOrEqual(48);
    expect(card.recipeLines.some((l) => l.includes("Third wave water"))).toBe(true);
  });

  it("never leaks notes, observations, or tastings into the card", () => {
    const card = toShareCardData({
      brew: { dose_g: 15, water_g: 250, notes: "secret diarrea recipe", id: "abc", user_id: "u1" },
      coffeeName: "Secret",
      score: null,
    });
    const blob = JSON.stringify(card);
    expect(blob).not.toContain("secret");
    expect(blob).not.toContain("user_id");
    const text = formatShareCardText(card);
    expect(text).not.toContain("secret");
  });
});

describe("formatShareCardText", () => {
  it("ends with BrewLog branding and includes the score line when scored", () => {
    const text = formatShareCardText({
      coffeeName: "Ethiopia", ratio: "1:16", recipeLines: ["15 g coffee"], score: 4.5, scoreLabel: "4.5",
    });
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
    });
    expect(() => drawShareCard(stubCtx(), scored)).not.toThrow();
    const unscored = toShareCardData({ brew: {}, coffeeName: "Plain", score: null });
    const ctx = stubCtx();
    expect(() => drawShareCard(ctx, unscored)).not.toThrow();
    // Unscored card never draws a star/score glyph.
    const drawn = (ctx.fillText as unknown as { mock: { calls: string[][] } }).mock.calls.flat().join(" ");
    expect(drawn).not.toContain("★");
  });
});
