import { describe, expect, it } from "vitest";
import { compareRowsFor, filterBrewOptions, resolveCompareSelection, stepActive, toComparableBrew, toCompareOption, valuesChanged, type BrewOption } from "@/lib/domain/brew-diff";
import { diffBrews } from "@/lib/domain/compare";
import { formatDuration } from "@/lib/domain/brew-time";

const base = {
  id: "a",
  dose_g: 15,
  water_g: 225,
  temp_c: 92,
  grind_clicks: 70,
  grinder: "K-Ultra",
  dripper: "Origami Air S",
  filter: "Cafec Abaca",
  water_source: "Scala",
  pour_count: 4,
  total_time_sec: 162,
  final_beverage_g: 178,
  notes: null,
  coffee_id: "11111111-1111-1111-1111-111111111111",
  session_id: null,
  coffees: { name: "Competencia" },
  sessions: null,
  observations: [{ acidity: "medium", sweetness: "medium", hot_notes: "Sweet." }],
};

describe("toComparableBrew", () => {
  it("resolves relations to names, never UUIDs or objects", () => {
    const c = toComparableBrew(base);
    expect(c.Coffee).toBe("Competencia");
    expect(c.Session).toBe("No session");
    expect(c["Starting temperature"]).toBe("92°C");
    expect(c.Grind).toBe("70 clicks");
    expect(c["Brew time"]).toBe("2:42");
    expect(c["Hot notes"]).toBe("Sweet.");
    const blob = JSON.stringify(c);
    expect(blob).not.toContain("11111111");
    expect(blob).not.toContain("[object Object]");
  });

  it("no longer carries legacy fixed attributes (structured tasting compares separately)", () => {
    const c = toComparableBrew(base);
    for (const k of ["Acidity", "Sweetness", "Body", "Clarity", "Bitterness", "Astringency", "Intensity", "Balance", "Finish"]) {
      expect(k in c).toBe(false);
    }
    // free-text notes stay part of the observation record
    expect(c["Hot notes"]).toBe("Sweet.");
  });

  it("marks missing values as unknown, identically on both sides", () => {
    const c = toComparableBrew({ ...base, temp_c: null, observations: [] });
    expect(c["Starting temperature"]).toBe("-");
    expect(c["Hot notes"]).toBe("-");
  });

  it("carries water/technique fields; booleans read Yes/No with - for unrecorded", () => {
    const c = toComparableBrew({
      ...base,
      water_brand: "Third Wave",
      water_ppm: 150,
      water_description: null,
      thermal_shock: "none",
      lilydrip: true,
      melodrip: false,
      selected_beans: null,
    });
    expect(c["Selected beans"]).toBe("-");
    expect(c["Planned water"]).toBe("225 g");
    expect(c["Water brand"]).toBe("Third Wave");
    expect(c.PPM).toBe("150 ppm");
    expect(c["Water description"]).toBe("-");
    expect(c["Water notes"]).toBe("-");
    expect(c["Thermal shock"]).toBe("none");
    expect(c.Bypass).toBe("-");
    // numeric bypass: explicit 0 stays 0, missing stays unrecorded
    expect(toComparableBrew({ ...base, bypass_g: 0 })["Bypass (g)"]).toBe("0 g");
    expect(c["Bypass (g)"]).toBe("-");
    // poured total comes from structured pours, not planned water
    expect(c.Poured).toBe("-");
    expect(toComparableBrew(base, [{ amount_g: 300 }]).Poured).toBe("300 g");
    expect(c.LilyDrip).toBe("Yes");
    expect(c.MeloDrip).toBe("No");
  });
});

describe("compare answers what changed", () => {
  it("splits changed vs unchanged on resolved scalars", () => {
    const a = toComparableBrew(base);
    const b = toComparableBrew({ ...base, temp_c: 94, grind_clicks: 73, filter: "Cafec Wave" });
    expect(diffBrews(a, b).changed.sort()).toEqual(["Filter", "Grind", "Starting temperature"]);
    expect(diffBrews(a, b).same).toContain("Coffee");
    expect(diffBrews(a, b).same).toContain("Dose");
    expect(diffBrews(a, b).same).toContain("Session");
  });
});

describe("resolveCompareSelection", () => {
  const ids = ["a", "b", "c", "d"];
  it("defaults to the latest two", () => {
    expect(resolveCompareSelection(ids, [])).toEqual(["a", "b"]);
  });
  it("opens a Compare-this-brew deep link (?a= only) with the brew as slot 1", () => {
    expect(resolveCompareSelection(ids, ["c", null, null, null])).toEqual(["c", "a"]);
  });
  it("honors explicit, valid, distinct params", () => {
    expect(resolveCompareSelection(ids, ["c", "a", null, null])).toEqual(["c", "a"]);
  });
  it("keeps >2 explicit params and drops unknown or duplicate ones in order", () => {
    expect(resolveCompareSelection(ids, ["c", "a", "d", null])).toEqual(["c", "a", "d"]);
    expect(resolveCompareSelection(ids, ["zzz", "b", null, null])).toEqual(["b", "a"]);
    expect(resolveCompareSelection(ids, ["a", "a", null, null])).toEqual(["a", "b"]);
    expect(resolveCompareSelection(ids, ["a", "a", "b", null])).toEqual(["a", "b"]);
  });
  it("caps at COMPARE_MAX slots", () => {
    expect(resolveCompareSelection(ids, ["d", "c", "b", "a"])).toEqual(["d", "c", "b", "a"]);
    expect(resolveCompareSelection([...ids, "e"], ["e", "d", "c", "b", "a"])).toEqual(["e", "d", "c", "b"]);
  });
  it("pads to exactly two from the id list, never more, without explicit params", () => {
    expect(resolveCompareSelection(ids, ["c"])).toEqual(["c", "a"]);
    expect(resolveCompareSelection(ids, [null, null, null, null])).toEqual(["a", "b"]);
  });
  it("returns null when there is nothing to compare", () => {
    expect(resolveCompareSelection([], [])).toBeNull();
    expect(resolveCompareSelection(["a"], [])).toBeNull();
    expect(resolveCompareSelection(["a"], ["a"])).toBeNull();
  });
});

describe("valuesChanged", () => {
  it("flags any difference across N values, including '-'", () => {
    expect(valuesChanged(["92°C", "92°C", "94°C"])).toBe(true);
    expect(valuesChanged(["-", "40 g", "40 g"])).toBe(true);
    expect(valuesChanged(["No", "No", "No"])).toBe(false);
    expect(valuesChanged(["1:15", "1:15"])).toBe(false);
  });
});

describe("compareRowsFor", () => {
  const scalars = [
    { Coffee: "A", Dose: "15 g", LilyDrip: "Yes", Temp: "92°C" },
    { Coffee: "A", Dose: "17 g", LilyDrip: "No", Temp: "92°C" },
  ];
  it("builds rows with slot-aligned values and per-row changed", () => {
    const rows = compareRowsFor(scalars, ["Coffee", "Dose", "LilyDrip", "Temp"]);
    expect(rows).toEqual([
      { label: "Coffee", values: ["A", "A"], changed: false },
      { label: "Dose", values: ["15 g", "17 g"], changed: true },
      { label: "LilyDrip", values: ["Yes", "No"], changed: true },
      { label: "Temp", values: ["92°C", "92°C"], changed: false },
    ]);
  });
  it("hides all-'-' and all-'No' rows across N brews", () => {
    const rs = compareRowsFor(
      [{ X: "-" }, { X: "-" }, { X: "-" }],
      ["X"],
    );
    expect(rs).toEqual([]);
    expect(compareRowsFor([{ X: "No" }, { X: "No" }], ["X"])).toEqual([]);
  });
  it("keeps a row recorded on a single brew only", () => {
    expect(compareRowsFor([{ X: "-" }, { X: "40 g" }], ["X"])).toEqual([
      { label: "X", values: ["-", "40 g"], changed: true },
    ]);
  });
});

describe("toCompareOption", () => {
  const row = {
    id: "a",
    dose_g: 15,
    water_g: 225,
    brewed_at: "2026-09-20T12:00:00.000Z",
    created_at: "2026-09-20T12:00:00.000Z",
    coffees: { name: "Competencia" },
    sessions: { title: "Phase 1" },
  };
  it("labels options ratio · coffee without loading full rows", () => {
    const o = toCompareOption(row);
    expect(o.id).toBe("a");
    expect(o.label).toContain("1:15");
    expect(o.label).toContain("Competencia");
    expect(o.label).toContain("Phase 1");
  });
  it("handles array relations and unknown coffee", () => {
    expect(toCompareOption({ ...row, coffees: [{ name: "Washed" }] }).label).toContain("Washed");
    expect(toCompareOption({ ...row, coffees: null }).label).toContain("Coffee");
  });
  it("omits the session segment when unassigned", () => {
    expect(toCompareOption({ ...row, sessions: null }).label).not.toContain("Phase 1");
  });
  it("exposes a compact title + detail row", () => {
    const o = toCompareOption(row);
    expect(o.title).toBe("Competencia");
    expect(o.detail).toContain("1:15");
    expect(o.detail).toContain("15 g → 225 g");
    expect(o.detail).toContain("Sep 20");
  });
});

describe("filterBrewOptions", () => {
  const opts: BrewOption[] = [
    { id: "a", label: "1:15 · Competencia · Sep 20" },
    { id: "b", label: "1:16 · Washed · Sep 21" },
    { id: "c", label: "1:14 · Natural · Sep 22" },
  ];
  it("shows everything when the query is empty", () => {
    expect(filterBrewOptions(opts, "", "a")).toHaveLength(3);
    expect(filterBrewOptions(opts, "  ", "a")).toHaveLength(3);
  });
  it("matches case-insensitively on the label", () => {
    expect(filterBrewOptions(opts, "washed", "x").map((o) => o.id)).toEqual(["b"]);
    expect(filterBrewOptions(opts, "NATURAL", "x").map((o) => o.id)).toEqual(["c"]);
  });
  it("keeps the selected brew listed even when it does not match", () => {
    expect(filterBrewOptions(opts, "washed", "c").map((o) => o.id)).toEqual(["b", "c"]);
  });
});

describe("stepActive", () => {
  it("enters the list at the first/last item", () => {
    expect(stepActive(-1, 1, 3)).toBe(0);
    expect(stepActive(-1, -1, 3)).toBe(2);
  });
  it("wraps both directions", () => {
    expect(stepActive(2, 1, 3)).toBe(0);
    expect(stepActive(0, -1, 3)).toBe(2);
  });
  it("returns -1 for an empty list", () => {
    expect(stepActive(-1, 1, 0)).toBe(-1);
  });
});

describe("formatDuration", () => {
  it("renders naturally", () => {
    expect(formatDuration(150)).toBe("2:30");
    expect(formatDuration(45)).toBe("0:45");
    expect(formatDuration(162)).toBe("2:42");
  });
  it("returns null when nothing recorded", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
  });
});
