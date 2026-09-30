import { describe, expect, it } from "vitest";
import {
  actualWaterG,
  bedWaterG,
  eyPercent,
  plannedDeltaG,
  pouredTotalG,
  retainedG,
  type BrewWaterFacts,
} from "@/lib/domain/brew-water";
import type { PourFact } from "@/lib/domain/pours";

function pours(...amounts: number[]): PourFact[] {
  return amounts.map((amount_g, i) => ({
    sequence: i + 1, amount_g, timing_seconds: i * 30,
    bloom: false, pattern: "center", melodrip: false,
  }));
}

describe("pouredTotalG", () => {
  it("sums complete pour amounts", () => {
    expect(pouredTotalG(pours(50, 60, 70))).toBe(180);
    expect(pouredTotalG(pours(50.25, 60.15))).toBe(110.4);
  });
  it("skips rows without a valid positive amount", () => {
    expect(pouredTotalG([{ sequence: 1, amount_g: "abc", timing_seconds: 0, bloom: false, pattern: "center", melodrip: false }])).toBeNull();
    expect(pouredTotalG(pours(50, 0, 60))).toBe(110);
    expect(pouredTotalG(pours(-5))).toBeNull();
  });
  it("is null with no pours (unknown, never approximated)", () => {
    expect(pouredTotalG(null)).toBeNull();
    expect(pouredTotalG([])).toBeNull();
  });
});

describe("plannedDeltaG", () => {
  it("is poured minus planned", () => {
    expect(plannedDeltaG(250, pours(50, 60, 70))).toBe(-70);
    expect(plannedDeltaG(250, pours(220))).toBe(-30);
  });
  it("is null when either side is unknown", () => {
    expect(plannedDeltaG(null, pours(50))).toBeNull();
    expect(plannedDeltaG(250)).toBeNull();
    expect(plannedDeltaG(250, [])).toBeNull();
    expect(plannedDeltaG("", pours(50))).toBeNull();
  });
});

describe("actualWaterG", () => {
  it("uses the resolved poured total when present", () => {
    expect(actualWaterG(280, 300)).toBe(300);
  });
  it("falls back to planned water without pours", () => {
    expect(actualWaterG(280, null)).toBe(280);
    expect(actualWaterG(280, 0)).toBe(280);
    expect(actualWaterG(280, "junk")).toBe(280);
  });
  it("is null when both are unknown", () => {
    expect(actualWaterG(null, null)).toBeNull();
  });
});

describe("bedWaterG", () => {
  it("prefers poured water when pours exist", () => {
    expect(bedWaterG(250, pours(220))).toBe(220);
  });
  it("falls back to planned water without pours", () => {
    expect(bedWaterG(250)).toBe(250);
    expect(bedWaterG(250, [])).toBe(250);
    expect(bedWaterG(null)).toBeNull();
  });
});

describe("retainedG", () => {
  const facts = (over: Partial<BrewWaterFacts>): BrewWaterFacts => ({
    water_g: 250, final_beverage_g: 180, bypass_g: null, ...over,
  });
  it("uses actual pours when present: bed − (beverage − bypass)", () => {
    // 220 in the bed, 180 out with 0 recorded bypass → 40 retained
    expect(retainedG(facts({ water_g: 250 }), pours(50, 60, 60, 50))).toBe(40);
  });
  it("falls back to planned water without pours", () => {
    // 250 − (180 − 0) = 70
    expect(retainedG(facts({}))).toBe(70);
  });
  it("unknown bypass reads 0 only in the derivation", () => {
    // same as above: null bypass never blocks retention
    expect(retainedG(facts({ bypass_g: undefined }))).toBe(70);
  });
  it("subtracts recorded bypass: bed − (beverage − bypass)", () => {
    // 200 in bed, 180 out incl. 20 bypass → bed held 220 − ... = 40
    expect(retainedG(facts({ water_g: 200, bypass_g: 20 }), pours(120, 80))).toBe(40);
  });
  it("is null when bed water or beverage is unknown", () => {
    expect(retainedG(facts({ water_g: null }))).toBeNull();
    expect(retainedG(facts({ final_beverage_g: null }))).toBeNull();
  });
});

describe("eyPercent", () => {
  it("computes TDS × beverage / dose", () => {
    // 1.35% × 180 g / 15 g = 16.2%
    expect(eyPercent({ tds_percent: 1.35, final_beverage_g: 180, dose_g: 15 })).toBe(16.2);
  });
  it("is null unless TDS, beverage, and dose all exist", () => {
    expect(eyPercent({ tds_percent: 1.35, final_beverage_g: 180 })).toBeNull();
    expect(eyPercent({ tds_percent: 1.35, dose_g: 15 })).toBeNull();
    expect(eyPercent({ final_beverage_g: 180, dose_g: 15 })).toBeNull();
    expect(eyPercent({ tds_percent: 1.35, final_beverage_g: 180, dose_g: 0 })).toBeNull();
  });
  it("never fabricates for legacy rows (all fields missing)", () => {
    expect(eyPercent({})).toBeNull();
  });
});
