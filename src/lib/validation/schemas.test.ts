import { describe, expect, it } from "vitest";
import { defaultBrewedDate, isFutureDateString } from "@/lib/domain/brew-date";
import { brewSchema, coffeeSchema, cuppingSchema } from "@/lib/validation/schemas";

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
