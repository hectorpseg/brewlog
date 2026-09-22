import { describe, expect, it } from "vitest";
import { experimentStatus } from "@/lib/domain/experiments";
import { cuppingSchema, experimentSchema } from "@/lib/validation/schemas";

describe("experimentStatus", () => {
  it("marks answered experiments", () => {
    expect(experimentStatus({ conclusion: "68 confirmed." })).toBe("answered");
    expect(experimentStatus({ actual_result: "Sweeter." })).toBe("answered");
  });
  it("marks open experiments", () => {
    expect(experimentStatus({})).toBe("open");
    expect(experimentStatus({ conclusion: "  " })).toBe("open");
    expect(experimentStatus({ actualResult: null })).toBe("open");
  });
});

describe("experimentSchema", () => {
  it("accepts a question without an answer yet", () => {
    const r = experimentSchema.safeParse({ hypothesis: "Finer grind extracts more." });
    expect(r.success).toBe(true);
  });
  it("accepts a brew link and a full record", () => {
    const r = experimentSchema.safeParse({
      brewId: "123e4567-e89b-12d3-a456-426614174000",
      hypothesis: "H",
      changedVariables: "Grind 70 → 68",
      expectedResult: "More body",
      actualResult: "More body",
      conclusion: "Confirmed",
      nextQuestion: "Ratio next?",
    });
    expect(r.success).toBe(true);
  });
});

describe("cuppingSchema", () => {
  const coffeeId = "123e4567-e89b-12d3-a456-426614174000";
  it("accepts a minimal cupping: coffee + date", () => {
    const r = cuppingSchema.safeParse({ coffeeId, cuppedAt: "2026-09-21" });
    expect(r.success).toBe(true);
  });
  it("accepts prep info and sensory notes, all optional", () => {
    const r = cuppingSchema.safeParse({
      coffeeId,
      cuppedAt: "2026-09-21",
      doseG: 10,
      waterG: 200,
      grind: "coarse",
      hotNotes: "Floral.",
      warmNotes: "Sweet.",
      coldNotes: "Clean.",
      notes: "Baseline before brews.",
    });
    expect(r.success).toBe(true);
  });
  it("rejects missing coffee and malformed dates", () => {
    expect(cuppingSchema.safeParse({ cuppedAt: "2026-09-21" }).success).toBe(false);
    expect(cuppingSchema.safeParse({ coffeeId, cuppedAt: "last Tuesday" }).success).toBe(false);
    expect(cuppingSchema.safeParse({ coffeeId, cuppedAt: "" }).success).toBe(true);
  });
  it("accepts grinder + clicks for reproducible prep, both optional", () => {
    const r = cuppingSchema.safeParse({
      coffeeId,
      cuppedAt: "2026-09-21",
      grinder: "K-Ultra",
      grindClicks: 85,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.grinder).toBe("K-Ultra");
      expect(r.data.grindClicks).toBe(85);
    }
    expect(cuppingSchema.safeParse({ coffeeId, grinder: "", grindClicks: "" }).success).toBe(true);
    expect(cuppingSchema.safeParse({ coffeeId, grindClicks: 999 }).success).toBe(false);
  });
});
