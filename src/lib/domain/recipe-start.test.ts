import { describe, expect, it } from "vitest";
import { recipeStartingValues, formInitKey, inheritedFieldNames } from "@/lib/domain/recipe-start";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { pourRowsFromJson } from "@/lib/domain/pours";

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

  it("inherits water/technique recipe facts and never water notes", () => {
    const v = recipeStartingValues({
      ...previous,
      selected_beans: true,
      water_brand: "Third Wave",
      water_ppm: 120,
      water_description: "TPM profile",
      water_notes: "flat after boil",
      thermal_shock: "none",
      bypass: "0 g",
      lilydrip: true,
      melodrip: false,
    }, "coffee-1");
    expect(v.selectedBeans).toBe(true);
    expect(v.waterBrand).toBe("Third Wave");
    expect(v.waterPpm).toBe(120);
    expect(v.waterDescription).toBe("TPM profile");
    expect(v.thermalShock).toBe("none");
    expect(v.bypass).toBe("0 g");
    expect(v.lilydrip).toBe(true);
    expect(v.melodrip).toBeUndefined();
    // water notes are annotations: same reset category as brew notes
    expect(v.waterNotes).toBeUndefined();
  });

  it("does NOT copy historical/result data", () => {
    const v = recipeStartingValues(previous, "coffee-1");
    expect(v.brewTimeMin).toBeUndefined();
    expect(v.brewTimeSec).toBeUndefined();
    expect(v.finalBeverageG).toBeUndefined();
    expect(v.notes).toBeUndefined();
    expect(v.expectedText).toBeUndefined();
    expect(v.hotNotes).toBeUndefined();
    expect(v.warmNotes).toBeUndefined();
    expect(v.coldNotes).toBeUndefined();
    expect(v.freeformNotes).toBeUndefined();
  });

  it("never copies expected text, even when the previous brew has some", () => {
    const v = recipeStartingValues({ ...previous, expected_text: "Expect sweet" }, "coffee-1");
    expect(v.expectedText).toBeUndefined();
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

  it("starts a genuinely fresh brew empty — no invented recipe defaults", () => {
    const v = recipeStartingValues(null, "coffee-1");
    expect(v.coffeeId).toBe("coffee-1");
    expect(v.brewedAt).toBe(defaultBrewedDate());
    expect(v.doseG).toBeUndefined();
    expect(v.waterG).toBeUndefined();
    expect(v.tempC).toBeUndefined();
    expect(v.grindClicks).toBeUndefined();
    expect(v.grinder).toBeUndefined();
    expect(v.dripper).toBeUndefined();
    expect(v.filter).toBeUndefined();
    expect(v.waterSource).toBeUndefined();
    expect(v.selectedBeans).toBeUndefined();
    expect(v.waterBrand).toBeUndefined();
    expect(v.waterPpm).toBeUndefined();
    expect(v.thermalShock).toBeUndefined();
    expect(v.lilydrip).toBeUndefined();
    expect(v.melodrip).toBeUndefined();
    expect(v.pourCount).toBeUndefined();
    expect(v.sessionId).toBeUndefined();
  });

  it("a copy with missing values stays missing instead of backfilled", () => {
    const v = recipeStartingValues({ coffee_id: "c", dose_g: 16 }, "c");
    expect(v.doseG).toBe(16);
    expect(v.waterG).toBeUndefined();
    expect(v.grinder).toBeUndefined();
  });

  it("inherits structured pours as recipe, never tasting data", () => {
    const serverPours = [
      { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", note: null },
      { sequence: 2, amount_g: 60, timing_seconds: 35, bloom: false, pattern: "circular", note: "slow" },
    ];
    const v = recipeStartingValues(previous, "coffee-1", serverPours);
    expect(pourRowsFromJson(v.pours)).toEqual([
      { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "", temp: "", melodrip: false, switchState: "" },
      { time: "0:35", amount: "60", bloom: false, pattern: "circular", note: "slow", temp: "", melodrip: false, switchState: "" },
    ]);
    // tasting still never inherited alongside
    expect(v.tastings).toBeUndefined();
    expect(v.hotNotes).toBeUndefined();
  });

  it("starts with no pours when the previous brew has none - never synthesized", () => {
    expect(recipeStartingValues(previous, "coffee-1").pours).toBeUndefined();
    expect(recipeStartingValues(previous, "coffee-1", []).pours).toBeUndefined();
    expect(recipeStartingValues(previous, "coffee-1", null).pours).toBeUndefined();
    expect(recipeStartingValues(null, "coffee-1").pours).toBeUndefined();
  });

  // New from this was blank because an already-mounted react-hook-form
  // ignores later defaultValues: the form key drives the remount.
  describe("formInitKey", () => {
    it("blank + brew without a source is stable across re-renders", () => {
      expect(formInitKey(null, undefined)).toBe("blank");
      expect(formInitKey(null, undefined)).toBe(formInitKey(null));
    });

    it("a copy source remounts the form and separates sources", () => {
      expect(formInitKey("brew-a")).toMatch(/^copy-brew-a$/);
      expect(formInitKey("brew-a")).not.toBe(formInitKey("brew-b"));
      // Brew A vs Brew B produce distinct keys so each initializes from its
      // own source, and the blank key never collides with a copy key.
      expect(formInitKey(null, "coffee-1")).toBe("blank-coffee-1");
      expect(formInitKey("brew-a")).not.toBe(formInitKey(null, "coffee-1"));
    });

    it("same source keeps one mounted form (no reset on unrelated renders)", () => {
      expect(formInitKey("same-brew")).toBe(formInitKey("same-brew"));
      expect(formInitKey("same-brew", "coffee-1")).toBe(formInitKey("same-brew", "coffee-9"));
    });
  });

  it("initializes Brew A vs Brew B independently end-to-end", () => {
    // New Brew from Brew A → Brew A recipe values are used.
    const fromA = recipeStartingValues({ ...previous, dose_g: 16, water_g: 240 }, "coffee-1");
    // New Brew from Brew B → Brew B recipe values are used.
    const fromB = recipeStartingValues({ ...previous, dose_g: 12, water_g: 180, grinder: "Comandante" }, "coffee-1");
    expect(fromA.doseG).toBe(16);
    expect(fromA.waterG).toBe(240);
    expect(fromA.grinder).toBe("K-Ultra");
    expect(fromB.doseG).toBe(12);
    expect(fromB.waterG).toBe(180);
    expect(fromB.grinder).toBe("Comandante");
    // + Brew (no source) → blank recipe, only date/coffee defaults.
    const blank = recipeStartingValues(null, "coffee-1");
    expect(blank.doseG).toBeUndefined();
    expect(blank.waterG).toBeUndefined();
    expect(blank.doseG).not.toBe(fromA.doseG);
  });
});

describe("inheritedFieldNames", () => {
  it("marks only fields that were actually carried over", () => {
    const inherited = inheritedFieldNames({ ...previous, water_g: null, grinder: "" }, null);
    expect(inherited.has("coffeeId")).toBe(true);
    expect(inherited.has("doseG")).toBe(true);
    expect(inherited.has("waterG")).toBe(false);
    expect(inherited.has("grinder")).toBe(false);
    expect(inherited.has("brewedAt")).toBe(false);
    expect(inherited.has("finalBeverageG")).toBe(false);
  });

  it("starts blank when there is no previous brew", () => {
    const inherited = inheritedFieldNames(null, null);
    expect(inherited.size).toBe(0);
  });
});
