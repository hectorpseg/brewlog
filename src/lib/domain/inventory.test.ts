import { describe, expect, it } from "vitest";
import { isDepletedCoffee, partitionCoffeesForBrewSelect } from "@/lib/domain/inventory";

describe("isDepletedCoffee", () => {
  it("treats exactly 0 g as depleted", () => {
    expect(isDepletedCoffee(0)).toBe(true);
  });
  it("treats positive stock as available", () => {
    expect(isDepletedCoffee(0.1)).toBe(false);
    expect(isDepletedCoffee(1)).toBe(false);
    expect(isDepletedCoffee(250)).toBe(false);
  });
  it("treats unknown stock as available", () => {
    expect(isDepletedCoffee(null)).toBe(false);
    expect(isDepletedCoffee(undefined)).toBe(false);
  });
  it("treats replenished coffee as available again", () => {
    const depletedThenReplenished = [0, 50];
    expect(depletedThenReplenished.map(isDepletedCoffee)).toEqual([true, false]);
  });
});

describe("partitionCoffeesForBrewSelect", () => {
  it("separates available and depleted coffees for the selector", () => {
    const coffees = [
      { id: "c1", name: "Gesha", remaining_weight_g: 250 },
      { id: "c2", name: "Tabi", remaining_weight_g: 0 },
      { id: "c3", name: "Old lot", remaining_weight_g: null },
      { id: "c4", name: "Empty", remaining_weight_g: 0 },
    ];
    const { available, depleted } = partitionCoffeesForBrewSelect(coffees);
    expect(available.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(depleted.map((c) => c.id)).toEqual(["c2", "c4"]);
  });
  it("puts everything in available when nothing is depleted", () => {
    const coffees = [{ id: "c1", name: "Gesha", remaining_weight_g: 5 }];
    const { available, depleted } = partitionCoffeesForBrewSelect(coffees);
    expect(available).toHaveLength(1);
    expect(depleted).toHaveLength(0);
  });
});
