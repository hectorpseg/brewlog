import { describe, expect, it } from "vitest";
import { experimentStatus } from "@/lib/domain/experiments";
import { experimentSchema } from "@/lib/validation/schemas";

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
