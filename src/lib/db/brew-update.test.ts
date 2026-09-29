import { describe, expect, it } from "vitest";
import { brewEditorDefaults, planBrewSync, toBrewUpdateRow } from "@/lib/db/brew-update";

describe("toBrewUpdateRow", () => {
  it("maps form keys to columns and skips empty values", () => {
    expect(toBrewUpdateRow({ grindClicks: "68", tempC: "", notes: "hi" })).toEqual({
      grind_clicks: "68",
      notes: "hi",
    });
  });

  it("assigns and clears the session association", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(toBrewUpdateRow({ sessionId: id }).session_id).toBe(id);
    expect(toBrewUpdateRow({ sessionId: "" }).session_id).toBeNull();
  });

  it("maps water/technique fields and skips empty values", () => {
    expect(
      toBrewUpdateRow({
        waterBrand: "Third Wave", waterPpm: "150", waterDescription: "TPM",
        waterNotes: "flat", thermalShock: "none", bypass: "0 g",
        waterSource: "",
      }),
    ).toEqual({
      water_brand: "Third Wave",
      water_ppm: "150",
      water_description: "TPM",
      water_notes: "flat",
      thermal_shock: "none",
      bypass: "0 g",
    });
  });

  it("writes beans/technique booleans only on explicit true/false", () => {
    expect(toBrewUpdateRow({ selectedBeans: "true", lilydrip: "false" })).toEqual({
      selected_beans: true,
      lilydrip: false,
    });
    expect(toBrewUpdateRow({ melodrip: "", selectedBeans: undefined })).toEqual({});
  });

  it("maps expected text to its column and skips it when blank", () => {
    expect(toBrewUpdateRow({ expectedText: "Expect sweet" })).toEqual({
      expected_text: "Expect sweet",
    });
    expect(toBrewUpdateRow({ expectedText: "" })).toEqual({});
  });

  it("ignores unknown keys and yields an empty row when nothing changed", () => {
    expect(toBrewUpdateRow({ hotNotes: "x", doseG: undefined })).toEqual({});
  });

  it("ignores the tastings draft field (persisted via upsertTastings, not updateBrew)", () => {
    expect(toBrewUpdateRow({ tastings: '[{"stage":"hot","attribute":"a","value":"5"}]' })).toEqual({});
  });

  it("maps a valid brew date to noon UTC and skips the column otherwise", () => {
    expect(toBrewUpdateRow({ brewedAt: "2026-09-21" })).toEqual({
      brewed_at: "2026-09-21T12:00:00.000Z",
    });
    expect(toBrewUpdateRow({ brewedAt: "" })).toEqual({});
    expect(toBrewUpdateRow({ brewedAt: "yesterday" })).toEqual({});
  });
});

describe("brewEditorDefaults", () => {
  const brew = {
    id: "b1",
    dose_g: 15,
    water_g: 250,
    brewed_at: "2026-09-21T12:00:00.000Z",
    temp_c: 92,
    grind_clicks: 70,
    grinder: "K-Ultra",
    dripper: "Origami",
    filter: "Abaca",
    water_source: "Scala",
    pour_count: 4,
    total_time_sec: 150,
    final_beverage_g: 180,
    notes: "good",
    session_id: null,
  };
  const observation = { acidity: "medium", hot_notes: "Sweet." };

  it("carries every persisted gear field into the editor (regression: empty gear on reopen)", () => {
    const f = brewEditorDefaults(brew, observation);
    expect(f.grinder).toBe("K-Ultra");
    expect(f.dripper).toBe("Origami");
    expect(f.filter).toBe("Abaca");
    expect(f.waterSource).toBe("Scala");
    expect(f.pourCount).toBe("4");
  });

  it("maps recipe, time, notes, and observations alongside gear", () => {
    const f = brewEditorDefaults(brew, observation);
    expect(f.doseG).toBe("15");
    expect(f.tempC).toBe("92");
    expect(f.brewedAt).toBe("2026-09-21");
    expect(f.brewTimeMin).toBe("2");
    expect(f.brewTimeSec).toBe("30");
    expect(f.notes).toBe("good");
    expect(f.acidity).toBe("medium");
    expect(f.hotNotes).toBe("Sweet.");
  });

  it("renders unknown values as empty strings without crashing on null observation", () => {
    const f = brewEditorDefaults({ ...brew, grinder: null, pour_count: null }, null);
    expect(f.grinder).toBe("");
    expect(f.pourCount).toBe("");
    expect(f.acidity).toBe("");
    expect(f.hotNotes).toBe("");
  });

  it("carries expected text into the editor, blank for pre-S6 brews", () => {
    expect(brewEditorDefaults({ ...brew, expected_text: "Expect sweet" }, observation).expectedText).toBe("Expect sweet");
    expect(brewEditorDefaults({ ...brew, expected_text: null }, observation).expectedText).toBe("");
    expect(brewEditorDefaults(brew, observation).expectedText).toBe("");
  });

  it("carries water/technique facts into the editor", () => {
    const f = brewEditorDefaults(
      { ...brew, selected_beans: true, water_brand: "Third Wave", water_ppm: 150, thermal_shock: "none", melodrip: true },
      observation,
    );
    expect(f.selectedBeans).toBe("true");
    expect(f.waterBrand).toBe("Third Wave");
    expect(f.waterPpm).toBe("150");
    expect(f.thermalShock).toBe("none");
    expect(f.lilydrip).toBe("false");
    expect(f.melodrip).toBe("true");
  });

  it("carries structured tastings into the editor draft and keeps legacy notes alongside", () => {
    const f = brewEditorDefaults(brew, observation, [
      { stage: "hot", attribute: "acidity", value: 8 },
      { stage: "cold", attribute: "plum skin", value: 6 },
    ]);
    expect(JSON.parse(f.tastings)).toEqual([
      { stage: "hot", attribute: "acidity", value: "8" },
      { stage: "cold", attribute: "plum skin", value: "6" },
    ]);
    // legacy observation still maps: existing brews remain readable
    expect(f.acidity).toBe("medium");
    expect(f.hotNotes).toBe("Sweet.");
  });

  it("defaults tastings to an empty draft when the brew predates them", () => {
    expect(JSON.parse(brewEditorDefaults(brew, observation).tastings)).toEqual([]);
    expect(JSON.parse(brewEditorDefaults(brew, observation, null).tastings)).toEqual([]);
  });

  it("carries structured pours into the editor draft in sequence order", () => {
    const f = brewEditorDefaults(brew, observation, null, [
      { sequence: 2, amount_g: 60, timing_seconds: 35, bloom: false, pattern: "circular", note: "slow" },
      { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", note: null },
    ]);
    expect(JSON.parse(f.pours)).toEqual([
      { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "", temp: "", melodrip: false, switchState: "" },
      { time: "0:35", amount: "60", bloom: false, pattern: "circular", note: "slow", temp: "", melodrip: false, switchState: "" },
    ]);
  });

  it("defaults pours to an empty draft when the brew predates them", () => {
    expect(JSON.parse(brewEditorDefaults(brew, observation).pours)).toEqual([]);
    expect(JSON.parse(brewEditorDefaults(brew, observation, null, null).pours)).toEqual([]);
  });

  it("ignores the pours draft field (persisted via upsertPours, not updateBrew)", () => {
    expect(toBrewUpdateRow({ pours: '[{"time":"0:00","amount":"40","bloom":true,"pattern":"center","note":""}]' })).toEqual({});
  });
});

describe("planBrewSync", () => {
  const brew = {
    id: "b1",
    dose_g: 15,
    water_g: 250,
    brewed_at: "2026-09-21T12:00:00.000Z",
    temp_c: 92,
    grind_clicks: 70,
    grinder: "K-Ultra",
    notes: "good",
    session_id: null,
  };
  const observation = { hot_notes: "Sweet." };
  const pristine = () => brewEditorDefaults(brew, observation, null, null) as Record<string, string | undefined>;

  it("plans nothing when the form matches the last-synced snapshot", () => {
    const plan = planBrewSync(pristine(), pristine());
    expect(plan.slices).toEqual([]);
  });

  it("plans only the recipe slice for a recipe edit", () => {
    const plan = planBrewSync({ ...pristine(), tempC: "93" }, pristine());
    expect(plan.slices).toEqual(["recipe"]);
  });

  it("plans only the notes slice for a note edit (recipe write skipped)", () => {
    const plan = planBrewSync({ ...pristine(), hotNotes: "Sweet. Bright." }, pristine());
    expect(plan.slices).toEqual(["notes"]);
  });

  it("plans only the recipe slice for an expected-text edit", () => {
    const plan = planBrewSync({ ...pristine(), expectedText: "Expect sweet" }, pristine());
    expect(plan.slices).toEqual(["recipe"]);
  });

  it("plans tastings alone when only the tasting draft changed", () => {
    const form = {
      ...pristine(),
      tastings: JSON.stringify([{ stage: "hot", attribute: "acidity", value: "7" }]),
    };
    const plan = planBrewSync(form, pristine());
    expect(plan.slices).toEqual(["tastings"]);
  });

  it("derives the legacy counter from new pours, dirtying recipe for the count", () => {
    const form = {
      ...pristine(),
      pours: JSON.stringify([
        { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "" },
        { time: "0:35", amount: "60", bloom: false, pattern: "pulse", note: "" },
      ]),
    };
    const plan = planBrewSync(form, pristine());
    expect(plan.pourEntries).toHaveLength(2);
    expect(plan.pourCount).toBe("2");
    expect(plan.slices).toEqual(["recipe", "pours"]);
  });

  it("clearing all pours dirties pours only, preserving the manual counter", () => {
    const synced = {
      ...pristine(),
      pours: JSON.stringify([
        { time: "0:35", amount: "60", bloom: false, pattern: "pulse", note: "" },
      ]),
      pourCount: "1",
    };
    const plan = planBrewSync({ ...synced, pours: "[]" }, synced);
    expect(plan.pourEntries).toEqual([]);
    expect(plan.pourCount).toBeNull();
    expect(plan.slices).toEqual(["pours"]);
  });
});
