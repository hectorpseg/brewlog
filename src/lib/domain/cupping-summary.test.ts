import { describe, expect, it } from "vitest";
import { formatCuppingSummary } from "@/lib/domain/cupping-summary";

const cupping = {
  id: "c1",
  user_id: "u1",
  coffee_id: "k1",
  cupped_at: "2026-09-21T12:00:00.000Z",
  created_at: "2026-09-21T12:00:00.000Z",
  dose_g: 10,
  water_g: 200,
  grind: "medium",
  grinder: "K-Ultra",
  grind_clicks: 85,
  notes: "Round, sweet finish.",
  hot_notes: "Bright.",
  warm_notes: null,
  cold_notes: "Clean.",
};

describe("formatCuppingSummary", () => {
  it("renders the canonical deterministic summary", () => {
    const text = formatCuppingSummary({ cupping, coffeeName: "Competencia" });
    expect(text).toBe(
      [
        "Competencia · Sep 21",
        "10 g dose · 200 g water (1:20) · K-Ultra · 85 clicks · medium",
        "Hot notes: Bright.",
        "Cold notes: Clean.",
        "Final take: Round, sweet finish.",
      ].join("\n"),
    );
    expect(formatCuppingSummary({ cupping, coffeeName: "Competencia" })).toBe(text);
  });

  it("omits absent values and never leaks database IDs", () => {
    const text = formatCuppingSummary({ cupping: { dose_g: 10, water_g: 200 } });
    expect(text).toBe("Cupping\n10 g dose · 200 g water (1:20)");
    expect(text).not.toContain("c1");
    expect(text).not.toContain("u1");
  });

  it("falls back to created_at when cupped_at is missing", () => {
    const text = formatCuppingSummary({
      cupping: { created_at: "2026-09-21T12:00:00.000Z" },
      coffeeName: "X",
    });
    expect(text).toBe("X · Sep 21");
  });
});
