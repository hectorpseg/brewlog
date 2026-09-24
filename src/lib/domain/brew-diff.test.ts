import { describe, expect, it } from "vitest";
import { resolveCompareIds, toComparableBrew, toCompareOption } from "@/lib/domain/brew-diff";
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
    expect(c.Temperature).toBe("92°C");
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
    expect(c.Temperature).toBe("-");
    expect(c["Hot notes"]).toBe("-");
  });
});

describe("compare answers what changed", () => {
  it("splits changed vs unchanged on resolved scalars", () => {
    const a = toComparableBrew(base);
    const b = toComparableBrew({ ...base, temp_c: 94, grind_clicks: 73, filter: "Cafec Wave" });
    const d = diffBrews(a, b);
    expect(d.changed.sort()).toEqual(["Filter", "Grind", "Temperature"]);
    expect(d.same).toContain("Coffee");
    expect(d.same).toContain("Dose");
    expect(d.same).toContain("Session");
  });
});

describe("resolveCompareIds", () => {
  const ids = ["a", "b", "c"];
  it("defaults to the latest two", () => {
    expect(resolveCompareIds(ids)).toEqual({ aId: "a", bId: "b" });
  });
  it("honors explicit, valid, distinct params", () => {
    expect(resolveCompareIds(ids, "c", "a")).toEqual({ aId: "c", bId: "a" });
  });
  it("falls back per side on unknown ids and de-duplicates", () => {
    expect(resolveCompareIds(ids, "zzz", "b")).toEqual({ aId: "a", bId: "b" });
    expect(resolveCompareIds(ids, "a", "a")).toEqual({ aId: "a", bId: "b" });
    expect(resolveCompareIds(ids, "b", "zzz")).toEqual({ aId: "b", bId: "a" });
  });
  it("returns null when there is nothing to compare", () => {
    expect(resolveCompareIds([])).toBeNull();
    expect(resolveCompareIds(["a"])).toBeNull();
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
