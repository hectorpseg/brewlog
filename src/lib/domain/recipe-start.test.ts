import { describe, expect, it } from "vitest";
import { recipeStartingValues } from "@/lib/domain/recipe-start";
import { COMPETITION_DEFAULTS } from "@/lib/domain/defaults";
import { defaultBrewedDate } from "@/lib/domain/brew-date";

const previous = {
  id: "brew-1",
  coffee_id: "coffee-1",
  dose_g: 16,
  water_g: 240,
  temp_c: 94,
  grind_clicks: 68,
  grinder: "K-Ultra",
  dripper: "Origami Air S",
  filter: "Cafec Wave",
  water_source: "Scala + Vicuña",
  pour_count: 3,
  session_id: "session-1",
  total_time_sec: 185,
  final_beverage_g: 172,
  notes: "Previous brew notes.",
  hot_notes: "Bright.",
  brewed_at: "2020-01-01T12:00:00.000Z",
};

describe("recipeStartingValues", () => {
  it("selects the current coffee", () => {
    expect(recipeStartingValues(previous, "coffee-1").coffeeId).toBe("coffee-1");
    expect(recipeStartingValues(null, "coffee-9").coffeeId).toBe("coffee-9");
  });

  it("uses previous recipe/equipment values as starting values", () => {
    const v = recipeStartingValues(previous, "coffee-1");
    expect(v.doseG).toBe(16);
    expect(v.waterG).toBe(240);
    expect(v.tempC).toBe(94);
    expect(v.grindClicks).toBe(68);
    expect(v.grinder).toBe("K-Ultra");
    expect(v.dripper).toBe("Origami Air S");
    expect(v.filter).toBe("Cafec Wave");
    expect(v.waterSource).toBe("Scala + Vicuña");
    expect(v.pourCount).toBe(3);
    expect(v.sessionId).toBe("session-1");
  });

  it("does NOT copy historical/result data", () => {
    const v = recipeStartingValues(previous, "coffee-1");
    expect(v.brewTimeMin).toBeUndefined();
    expect(v.brewTimeSec).toBeUndefined();
    expect(v.finalBeverageG).toBeUndefined();
    expect(v.notes).toBeUndefined();
    expect(v.hotNotes).toBeUndefined();
    expect(v.warmNotes).toBeUndefined();
    expect(v.coldNotes).toBeUndefined();
    expect(v.freeformNotes).toBeUndefined();
  });

  it("starts every fresh brew with clean tasting state", () => {
    for (const v of [recipeStartingValues(previous, "coffee-1"), recipeStartingValues(null, "coffee-1")]) {
      expect(v.tastings).toBeUndefined();
      expect(v.hotNotes).toBeUndefined();
      expect(v.warmNotes).toBeUndefined();
      expect(v.coldNotes).toBeUndefined();
      expect(v.freeformNotes).toBeUndefined();
    }
  });

  it("gives the new brew its own date, not the previous one", () => {
    const v = recipeStartingValues(previous, "coffee-1");
    expect(v.brewedAt).toBe(defaultBrewedDate());
    expect(v.brewedAt).not.toBe("2020-01-01");
  });

  it("leaves the previous brew record unchanged", () => {
    const frozen = Object.freeze({ ...previous });
    expect(() => recipeStartingValues(frozen, "coffee-1")).not.toThrow();
    expect(frozen.total_time_sec).toBe(185);
    expect(frozen.final_beverage_g).toBe(172);
  });

  it("starts from defaults when there is no previous brew", () => {
    const v = recipeStartingValues(null, "coffee-1");
    expect(v.coffeeId).toBe("coffee-1");
    expect(v.doseG).toBe(COMPETITION_DEFAULTS.doseG);
    expect(v.waterG).toBe(COMPETITION_DEFAULTS.waterG);
    expect(v.tempC).toBe(COMPETITION_DEFAULTS.tempC);
    expect(v.brewedAt).toBe(defaultBrewedDate());
    expect(v.sessionId).toBeUndefined();
  });
});
