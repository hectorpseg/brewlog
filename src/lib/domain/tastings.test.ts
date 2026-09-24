import { describe, expect, it } from "vitest";
import {
  CUSTOM_ATTRIBUTE_VALUE, SUGGESTED_ATTRIBUTES, compareTastings, completeTastingEntries, groupTastingsByStage, isSuggestedAttribute,
  isTastingStage, attributeOptions,
  normalizeAttribute, tastingRowsFromJson, tastingRowsToJson, tastingServerRowsToDraft,
  tastingsUpdatedAt,
} from "@/lib/domain/tastings";

describe("tasting stages", () => {
  it("supports hot, warm, and cold — nothing else", () => {
    expect(isTastingStage("hot")).toBe(true);
    expect(isTastingStage("warm")).toBe(true);
    expect(isTastingStage("cold")).toBe(true);
    expect(isTastingStage("lukewarm")).toBe(false);
    expect(isTastingStage("")).toBe(false);
    expect(isTastingStage(null)).toBe(false);
  });
  it("groups rows per stage, preserving independent values", () => {
    const grouped = groupTastingsByStage([
      { stage: "hot", attribute: "acidity", value: "8" },
      { stage: "warm", attribute: "acidity", value: "6" },
      { stage: "cold", attribute: "acidity", value: "4" },
    ]);
    // same attribute, different value per stage
    expect(grouped.hot).toHaveLength(1);
    expect(grouped.warm[0].value).toBe("6");
    expect(grouped.cold[0].value).toBe("4");
  });
});

describe("dynamic attributes", () => {
  it("suggests the familiar set without enforcing it", () => {
    for (const a of ["acidity", "sweetness", "body", "clarity", "bitterness", "astringency", "intensity", "balance", "finish", "juiciness"]) {
      expect(SUGGESTED_ATTRIBUTES).toContain(a);
    }
  });
  it("accepts multiple and custom attributes per stage", () => {
    const entries = completeTastingEntries([
      { stage: "hot", attribute: "acidity", value: "7" },
      { stage: "hot", attribute: "body", value: "5" },
      { stage: "hot", attribute: "plum skin", value: "6" },
    ]);
    expect(entries).toHaveLength(3);
    expect(entries[2]).toEqual({ stage: "hot", attribute: "plum skin", value: 6 });
  });
  it("normalizes names so casing cannot duplicate an attribute", () => {
    expect(normalizeAttribute(" Acidity ")).toBe("acidity");
    const entries = completeTastingEntries([
      { stage: "hot", attribute: "Acidity", value: "7" },
      { stage: "hot", attribute: "acidity", value: "5" },
    ]);
    expect(entries.map((e) => e.attribute)).toEqual(["acidity", "acidity"]);
  });
  it("never persists the custom-entry sentinel as data", () => {
    expect(completeTastingEntries([
      { stage: "hot", attribute: CUSTOM_ATTRIBUTE_VALUE, value: "5" },
    ])).toEqual([]);
  });
});

describe("attribute options (centralized select source)", () => {
  it("exposes the full fixed vocabulary with placeholder first", () => {
    const opts = attributeOptions("");
    expect(opts[0]).toEqual({ value: "", label: "Pick…" });
    for (const a of SUGGESTED_ATTRIBUTES) {
      expect(opts).toContainEqual({ value: a, label: a });
    }
    expect(opts.at(-1)).toEqual({ value: CUSTOM_ATTRIBUTE_VALUE, label: "Custom…" });
  });
  it("serves added rows from the same source as initial rows", () => {
    // Added rows start empty, so both render attributeOptions("").
    expect(attributeOptions("")).toHaveLength(SUGGESTED_ATTRIBUTES.length + 2);
  });
  it("preserves a row's own custom value instead of dropping it", () => {
    const opts = attributeOptions("bergamot");
    expect(opts).toContainEqual({ value: "bergamot", label: "bergamot (custom)" });
    // A suggested current value adds no duplicate entry.
    expect(attributeOptions("Acidity").filter((o) => o.value === "acidity")).toHaveLength(1);
  });
  it("matches suggestions case-insensitively, like stored data", () => {
    expect(isSuggestedAttribute("Acidity")).toBe(true);
    expect(isSuggestedAttribute("bergamot")).toBe(false);
    expect(isSuggestedAttribute("")).toBe(false);
  });
});

describe("scale bounds", () => {
  it("keeps 1-10, drops out-of-range and non-numeric values", () => {
    const entries = completeTastingEntries([
      { stage: "hot", attribute: "acidity", value: "1" },
      { stage: "hot", attribute: "body", value: "10" },
      { stage: "hot", attribute: "balance", value: "0" },
      { stage: "hot", attribute: "finish", value: "11" },
      { stage: "hot", attribute: "sweetness", value: "lots" },
      { stage: "hot", attribute: "", value: "5" },
      { stage: "hot", attribute: "clarity", value: "" },
    ]);
    expect(entries).toEqual([
      { stage: "hot", attribute: "acidity", value: 1 },
      { stage: "hot", attribute: "body", value: 10 },
    ]);
  });
});

describe("draft round-trip (autosave persistence)", () => {
  it("serializes editor rows, restores them, and drops only garbage", () => {
    const rows = [
      { stage: "hot" as const, attribute: "acidity", value: "7" },
      { stage: "cold" as const, attribute: "", value: "" },
    ];
    // half-filled rows survive the draft: they are local-only, never synced
    expect(tastingRowsFromJson(tastingRowsToJson(rows))).toEqual(rows);
    expect(tastingRowsFromJson("not json")).toEqual([]);
    expect(tastingRowsFromJson('[{"stage":"lukewarm","attribute":"x","value":"1"}]')).toEqual([]);
    expect(tastingRowsFromJson("")).toEqual([]);
  });
  it("converts server rows to editable draft rows", () => {
    expect(tastingServerRowsToDraft([
      { stage: "warm", attribute: "Body", value: 6 },
      { stage: "lukewarm", attribute: "x", value: 1 },
      null,
    ] as never)).toEqual([{ stage: "warm", attribute: "body", value: "6" }]);
    expect(tastingServerRowsToDraft(null)).toEqual([]);
  });
  it("reports the freshest server timestamp for draft weighing", () => {
    expect(tastingsUpdatedAt([
      { updated_at: "2026-09-20T12:00:00.000Z" },
      { updated_at: "2026-09-21T12:00:00.000Z" },
      { updated_at: null },
    ])).toBe("2026-09-21T12:00:00.000Z");
    expect(tastingsUpdatedAt([])).toBeNull();
    expect(tastingsUpdatedAt(null)).toBeNull();
  });
});

describe("legacy observations stay separate", () => {
  it("never coerces legacy text levels into numbers", () => {
    // "medium" is a legacy observation value, not a tasting fact: there is
    // no row shape that turns it into a 1-10 entry.
    const entries = completeTastingEntries([
      { stage: "hot", attribute: "acidity", value: "medium" },
    ]);
    expect(entries).toEqual([]);
  });
});

describe("compareTastings", () => {
  const a = [
    { stage: "hot", attribute: "body", value: 4 },
    { stage: "hot", attribute: "finish", value: 2 },
    { stage: "hot", attribute: "intensity", value: 5 },
    { stage: "warm", attribute: "sweetness", value: 7 },
  ];
  const b = [
    { stage: "hot", attribute: "body", value: 6 },
    { stage: "hot", attribute: "finish", value: 5 },
    { stage: "hot", attribute: "intensity", value: 5 },
    { stage: "warm", attribute: "florality", value: 6 },
    { stage: "warm", attribute: "sweetness", value: 8 },
    { stage: "cold", attribute: "acidity", value: 6 },
  ];

  it("structures Stage -> Attribute -> A / B with stable alphabetical order", () => {
    const stages = compareTastings(a, b);
    expect(stages.map((s) => s.stage)).toEqual(["hot", "warm", "cold"]);
    expect(stages[0].rows.map((r) => r.attribute)).toEqual(["body", "finish", "intensity"]);
    expect(stages[0].rows[0]).toEqual({ attribute: "body", a: 4, b: 6, changed: true });
    expect(stages[0].rows[2]).toEqual({ attribute: "intensity", a: 5, b: 5, changed: false });
  });

  it("represents one-sided attributes as missing, never invented", () => {
    const stages = compareTastings(a, b);
    const warm = stages.find((s) => s.stage === "warm")!;
    expect(warm.rows).toEqual([
      { attribute: "florality", a: null, b: 6, changed: true },
      { attribute: "sweetness", a: 7, b: 8, changed: true },
    ]);
    const cold = stages.find((s) => s.stage === "cold")!;
    expect(cold.rows).toEqual([{ attribute: "acidity", a: null, b: 6, changed: true }]);
  });

  it("omits stages with no entries on either side", () => {
    expect(compareTastings([], [])).toEqual([]);
    expect(compareTastings(null, null)).toEqual([]);
    const stages = compareTastings(a.slice(0, 3), b.slice(0, 3));
    expect(stages.map((s) => s.stage)).toEqual(["hot"]);
  });

  it("ignores garbage rows instead of comparing them", () => {
    const stages = compareTastings(
      [{ stage: "hot", attribute: "x", value: "lots" }, null] as never,
      [{ stage: "lukewarm", attribute: "x", value: 5 }] as never,
    );
    expect(stages).toEqual([]);
  });
});
