import { describe, expect, it } from "vitest";
import { defaultBrewedDate, isFutureDateString } from "@/lib/domain/brew-date";
import { brewSchema, coffeeSchema, cuppingSchema, newBrewFormSchema, tastingsPayloadSchema } from "@/lib/validation/schemas";

function shiftDays(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * 86400_000);
  return t.toISOString().slice(0, 10);
}

const today = defaultBrewedDate();
const tomorrow = shiftDays(today, 1);
const yesterday = shiftDays(today, -1);
const coffeeId = "123e4567-e89b-12d3-a456-426614174000";

describe("isFutureDateString", () => {
  it("flags tomorrow, allows today and yesterday", () => {
    expect(isFutureDateString(tomorrow)).toBe(true);
    expect(isFutureDateString(today)).toBe(false);
    expect(isFutureDateString(yesterday)).toBe(false);
  });
  it("ignores non-dates", () => {
    expect(isFutureDateString(null)).toBe(false);
    expect(isFutureDateString("")).toBe(false);
    expect(isFutureDateString("sometime")).toBe(false);
  });
});

describe("historical dates reject the future", () => {
  it("brew date", () => {
    const base = { coffeeId, doseG: 15, waterG: 250 };
    expect(brewSchema.safeParse({ ...base, brewedAt: tomorrow }).success).toBe(false);
    expect(brewSchema.safeParse({ ...base, brewedAt: today }).success).toBe(true);
    expect(brewSchema.safeParse({ ...base, brewedAt: yesterday }).success).toBe(true);
    expect(brewSchema.safeParse({ ...base }).success).toBe(true);
  });
  it("cupping date", () => {
    expect(cuppingSchema.safeParse({ coffeeId, cuppedAt: tomorrow }).success).toBe(false);
    expect(cuppingSchema.safeParse({ coffeeId, cuppedAt: today }).success).toBe(true);
    expect(cuppingSchema.safeParse({ coffeeId }).success).toBe(true);
  });
  it("coffee received date, while free text still passes through", () => {
    expect(coffeeSchema.safeParse({ name: "X", receivedDate: tomorrow }).success).toBe(false);
    expect(coffeeSchema.safeParse({ name: "X", receivedDate: yesterday }).success).toBe(true);
    expect(coffeeSchema.safeParse({ name: "X", receivedDate: "last week" }).success).toBe(true);
    expect(coffeeSchema.safeParse({ name: "X" }).success).toBe(true);
  });
});

describe("structured tasting payload", () => {
  it("accepts suggested, repeated-across-stages, and custom attributes", () => {
    const r = tastingsPayloadSchema.safeParse([
      { stage: "hot", attribute: "acidity", value: 8 },
      { stage: "warm", attribute: "acidity", value: 6 },
      { stage: "cold", attribute: "plum skin", value: 5 },
    ]);
    expect(r.success).toBe(true);
  });
  it("normalizes attribute names instead of duplicating them", () => {
    const r = tastingsPayloadSchema.safeParse([{ stage: "hot", attribute: " Acidity ", value: 7 }]);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data[0].attribute).toBe("acidity");
  });
  it("rejects unknown stages, missing names, and out-of-range values", () => {
    expect(tastingsPayloadSchema.safeParse([{ stage: "lukewarm", attribute: "x", value: 5 }]).success).toBe(false);
    expect(tastingsPayloadSchema.safeParse([{ stage: "hot", attribute: "", value: 5 }]).success).toBe(false);
    expect(tastingsPayloadSchema.safeParse([{ stage: "hot", attribute: "x", value: 0 }]).success).toBe(false);
    expect(tastingsPayloadSchema.safeParse([{ stage: "hot", attribute: "x", value: 11 }]).success).toBe(false);
  });
  it("new-brew form carries the tasting draft as an optional JSON string", () => {
    const base = { coffeeId, doseG: 15, waterG: 250 };
    expect(newBrewFormSchema.safeParse(base).success).toBe(true);
    const withTasting = newBrewFormSchema.safeParse({
      ...base,
      tastings: JSON.stringify([{ stage: "hot", attribute: "body", value: "4" }]),
    });
    expect(withTasting.success).toBe(true);
  });
});

// ponytail: S6 only — expectedText is nullable free text, never required.
describe("newBrewFormSchema expectedText", () => {
  it("accepts a brew without expected text (pre-S6 rows stay blank)", () => {
    expect(newBrewFormSchema.safeParse({ coffeeId, doseG: 15, waterG: 250 }).success).toBe(true);
  });
  it("accepts free text and rejects overlong values", () => {
    const base = { coffeeId, doseG: 15, waterG: 250 };
    expect(newBrewFormSchema.safeParse({ ...base, expectedText: "Expect sweet" }).success).toBe(true);
    expect(newBrewFormSchema.safeParse({ ...base, expectedText: "x".repeat(2001) }).success).toBe(false);
  });
});

// ponytail: water/technique enrichment rows — unknown stays unknown, booleans ride "true"/"false".
describe("brew water & technique fields", () => {
  const base = { coffeeId, doseG: 15, waterG: 250 };
  it("accepts absent water/technique facts (old rows)", () => {
    const r = brewSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.selectedBeans).toBeUndefined();
      expect(r.data.waterBrand).toBeUndefined();
      expect(r.data.waterPpm).toBeUndefined();
      expect(r.data.waterDescription).toBeUndefined();
      expect(r.data.waterNotes).toBeUndefined();
      expect(r.data.thermalShock).toBeUndefined();
      expect(r.data.bypass).toBeUndefined();
      expect(r.data.lilydrip).toBeUndefined();
      expect(r.data.melodrip).toBeUndefined();
    }
  });
  it("accepts water/technique facts, coercing booleans from strings", () => {
    const r = newBrewFormSchema.safeParse({
      ...base,
      selectedBeans: "true",
      waterBrand: "Third Wave",
      waterPpm: "150",
      waterDescription: "TPM",
      waterNotes: "flat",
      thermalShock: "none",
      bypass: "0 g",
      lilydrip: "true",
      melodrip: "false",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.selectedBeans).toBe(true);
      expect(r.data.waterPpm).toBe(150);
      expect(r.data.lilydrip).toBe(true);
      expect(r.data.melodrip).toBe(false);
    }
  });
  it("rejects out-of-range values", () => {
    expect(brewSchema.safeParse({ ...base, waterPpm: 1001 }).success).toBe(false);
    expect(brewSchema.safeParse({ ...base, waterPpm: -1 }).success).toBe(false);
    expect(brewSchema.safeParse({ ...base, waterBrand: "x".repeat(81) }).success).toBe(false);
    expect(brewSchema.safeParse({ ...base, lilydrip: "maybe" }).success).toBe(false);
  });
});
