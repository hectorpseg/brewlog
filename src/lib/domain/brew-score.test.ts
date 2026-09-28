import { describe, expect, it } from "vitest";
import { brewFinalScore, formatBrewScore, NO_SCORE_LABEL, starsForScore } from "@/lib/domain/brew-score";

describe("brewFinalScore", () => {
  it("computes the locked 4.25 example", () => {
    expect(brewFinalScore([8, 9, 7, 10])).toBe(4.25);
  });
  it("computes the locked 3.33 example", () => {
    expect(brewFinalScore([6, 6, 8])).toBeCloseTo(3.33, 2);
  });
  it("returns null when no values were entered", () => {
    expect(brewFinalScore([])).toBeNull();
  });
  it("handles a single value", () => {
    expect(brewFinalScore([10])).toBe(5);
    expect(brewFinalScore([1])).toBe(0.5);
  });
  it("ignores invalid/garbage values instead of counting them as zero", () => {
    expect(brewFinalScore(["", null, undefined, NaN, Infinity, "abc", {}, { value: "x" }])).toBeNull();
    expect(brewFinalScore([8, "nah", null, 6])).toBe(3.5);
  });
  it("treats custom attributes exactly like normal ones", () => {
    const rows = [
      { stage: "hot", attribute: "body", value: 8 },
      { stage: "warm", attribute: "my-custom-thing", value: 6 },
    ];
    expect(brewFinalScore(rows)).toBe(brewFinalScore([8, 6]));
    expect(brewFinalScore(rows)).toBe(3.5);
  });
  it("accepts persisted row objects across all stages", () => {
    expect(
      brewFinalScore([
        { stage: "hot", attribute: "acidity", value: 8 },
        { stage: "warm", attribute: "acidity", value: 6 },
        { stage: "cold", attribute: "sweetness", value: 7 },
      ]),
    ).toBeCloseTo(3.5, 10);
  });
  it("returns null for non-array input", () => {
    expect(brewFinalScore(null)).toBeNull();
    expect(brewFinalScore(undefined)).toBeNull();
    expect(brewFinalScore(8)).toBeNull();
  });
});

describe("formatBrewScore", () => {
  it("formats to one decimal", () => {
    expect(formatBrewScore(4.25)).toBe("4.3");
    expect(formatBrewScore(5)).toBe("5.0");
  });
  it("never renders a fake rating for null", () => {
    expect(formatBrewScore(null)).toBe(NO_SCORE_LABEL);
  });
});

describe("starsForScore", () => {
  it("rounds to the nearest half star", () => {
    expect(starsForScore(4.25)).toBe(4.5);
    expect(starsForScore(5)).toBe(5);
    expect(starsForScore(null)).toBeNull();
  });
});
