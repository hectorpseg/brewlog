import { describe, expect, it } from "vitest";
import { brewEditorDefaults, toBrewUpdateRow } from "@/lib/db/brew-update";

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
      { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "" },
      { time: "0:35", amount: "60", bloom: false, pattern: "circular", note: "slow" },
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
