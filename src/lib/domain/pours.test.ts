import { describe, expect, it } from "vitest";
import {
  comparePourFields,
  comparePours,
  completePourEntries,
  formatPourTime,
  formatPourTotal,
  parsePourTime,
  pourCountAndTotal,
  pourRowsFromJson,
  pourRowsToJson,
  pourServerRowsToDraft,
  poursUpdatedAt,
} from "@/lib/domain/pours";
import { poursPayloadSchema } from "@/lib/validation/schemas";

describe("parsePourTime", () => {
  it("accepts m:ss and plain seconds", () => {
    expect(parsePourTime("0:00")).toBe(0);
    expect(parsePourTime("0:35")).toBe(35);
    expect(parsePourTime("1:05")).toBe(65);
    expect(parsePourTime("65")).toBe(65);
    expect(parsePourTime(" 0:35 ")).toBe(35);
  });
  it("floors fractional entry to whole seconds (integer storage model)", () => {
    expect(parsePourTime("35.5")).toBe(35);
    expect(parsePourTime("76.7")).toBe(76);
    expect(parsePourTime("0:35.5")).toBe(35);
    expect(parsePourTime("1:05.5")).toBe(65);
  });
  it("rejects garbage without guessing", () => {
    expect(parsePourTime("")).toBeNull();
    expect(parsePourTime("soon")).toBeNull();
    expect(parsePourTime("1:05:10")).toBeNull();
    expect(parsePourTime("0:35.5.5")).toBeNull();
    expect(parsePourTime(":35")).toBeNull();
    expect(parsePourTime("-5")).toBeNull();
    expect(parsePourTime("-0:35")).toBeNull();
    expect(parsePourTime(null)).toBeNull();
  });
});

describe("formatPourTime", () => {
  it("renders m:ss", () => {
    expect(formatPourTime(0)).toBe("0:00");
    expect(formatPourTime(35)).toBe("0:35");
    expect(formatPourTime(65)).toBe("1:05");
  });
  it("returns null when nothing recorded", () => {
    expect(formatPourTime(null)).toBeNull();
    expect(formatPourTime(undefined)).toBeNull();
  });
});

describe("pour draft JSON", () => {
  it("round-trips editor rows and drops garbage", () => {
    const rows = [
      { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "" },
      { time: "0:35", amount: "60", bloom: false, pattern: "circular", note: "slow" },
    ];
    expect(pourRowsFromJson(pourRowsToJson(rows))).toEqual(rows);
    expect(pourRowsFromJson("")).toEqual([]);
    expect(pourRowsFromJson("not json")).toEqual([]);
    expect(pourRowsFromJson(JSON.stringify([{ time: "0:1", nope: true }]))).toEqual([]);
  });
  it("converts server rows to drafts in sequence order", () => {
    const drafts = pourServerRowsToDraft([
      { sequence: 2, amount_g: 60, timing_seconds: 35, bloom: false, pattern: "circular", note: null },
      { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", note: "" },
    ]);
    expect(drafts).toEqual([
      { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "" },
      { time: "0:35", amount: "60", bloom: false, pattern: "circular", note: "" },
    ]);
    expect(pourServerRowsToDraft(null)).toEqual([]);
    expect(pourServerRowsToDraft([])).toEqual([]);
  });
});

describe("completePourEntries", () => {
  it("keeps complete rows, renumbered 1..n", () => {
    const out = completePourEntries([
      { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "bloom " },
      { time: "halfway", amount: "60", bloom: false, pattern: "circular", note: "" },
      { time: "0:35", amount: "", bloom: false, pattern: "pulse", note: "" },
      { time: "1:10", amount: "80", bloom: false, pattern: "swirl", note: "" },
      { time: "1:10", amount: "80", bloom: false, pattern: "pulse", note: "" },
    ]);
    expect(out).toEqual([
      { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", note: "bloom" },
      { sequence: 2, amount_g: 80, timing_seconds: 70, bloom: false, pattern: "pulse", note: null },
    ]);
  });
  it("rejects non-positive amounts", () => {
    expect(completePourEntries([
      { time: "0:00", amount: "0", bloom: false, pattern: "center", note: "" },
      { time: "0:00", amount: "-5", bloom: false, pattern: "center", note: "" },
    ])).toEqual([]);
  });
  it("persists fractional entry as whole seconds (integer storage model)", () => {
    expect(completePourEntries([
      { time: "76.7", amount: "60", bloom: false, pattern: "pulse", note: "" },
      { time: "1:05.5", amount: "60", bloom: false, pattern: "pulse", note: "" },
    ])).toEqual([
      { sequence: 1, amount_g: 60, timing_seconds: 76, bloom: false, pattern: "pulse", note: null },
      { sequence: 2, amount_g: 60, timing_seconds: 65, bloom: false, pattern: "pulse", note: null },
    ]);
  });
});

describe("poursPayloadSchema", () => {
  it("accepts a valid payload", () => {
    const r = poursPayloadSchema.safeParse([
      { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", note: null },
      { sequence: 2, amount_g: 60, timing_seconds: 35, bloom: false, pattern: "center+circular" },
    ]);
    expect(r.success).toBe(true);
  });
  it("rejects bad amounts, negative timing, and unknown patterns", () => {
    const base = { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: false, pattern: "center" };
    expect(poursPayloadSchema.safeParse([{ ...base, amount_g: 0 }]).success).toBe(false);
    expect(poursPayloadSchema.safeParse([{ ...base, timing_seconds: -1 }]).success).toBe(false);
    expect(poursPayloadSchema.safeParse([{ ...base, pattern: "swirl" }]).success).toBe(false);
    expect(poursPayloadSchema.safeParse([{ ...base, sequence: 0 }]).success).toBe(false);
  });
  it("accepts string booleans for bloom without coercing truthy strings", () => {
    expect(poursPayloadSchema.safeParse([
      { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: "false", pattern: "center" },
    ]).success).toBe(true);
  });
});

describe("poursUpdatedAt", () => {
  it("returns the freshest timestamp, null when none", () => {
    expect(poursUpdatedAt(null)).toBeNull();
    expect(poursUpdatedAt([])).toBeNull();
    expect(poursUpdatedAt([{ updated_at: "2026-09-20" }, { updated_at: "2026-09-21" }])).toBe("2026-09-21");
  });
});

const pourA1 = { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", note: null };
const pourA2 = { sequence: 2, amount_g: 60, timing_seconds: 35, bloom: false, pattern: "circular", note: "slow" };

describe("comparePours", () => {
  it("flags changed, unchanged, and missing pours", () => {
    const rows = comparePours([pourA1, pourA2], [{ ...pourA1 }, { ...pourA2, amount_g: 70 }]);
    expect(rows.map((r) => [r.sequence, r.changed])).toEqual([[1, false], [2, true]]);
  });
  it("marks one-sided pours as changed", () => {
    const rows = comparePours([pourA1], [pourA1, pourA2]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ sequence: 2, a: null, changed: true });
  });
  it("returns nothing when neither side has pours", () => {
    expect(comparePours(null, [])).toEqual([]);
    expect(comparePours(undefined, undefined)).toEqual([]);
  });
  it("orders deterministically and ignores garbage rows", () => {
    const rows = comparePours(
      [pourA2, { sequence: 9, amount_g: "x", timing_seconds: 1, bloom: false, pattern: "center" }],
      [pourA1],
    );
    expect(rows.map((r) => r.sequence)).toEqual([1, 2]);
  });
});

describe("comparePourFields", () => {
  it("renders per-field rows with - for missing sides", () => {
    const rows = comparePourFields([pourA1], [{ ...pourA1 }, pourA2]);
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(byLabel["Pour 1 time"]).toMatchObject({ a: "0:00", b: "0:00", changed: false });
    expect(byLabel["Pour 1 bloom"]).toMatchObject({ a: "Yes", b: "Yes", changed: false });
    expect(byLabel["Pour 2 amount"]).toMatchObject({ a: "-", b: "60 g", changed: true });
    expect(byLabel["Pour 2 note"]).toMatchObject({ a: "-", b: "slow", changed: true });
  });
  it("returns nothing when neither side has pours", () => {
    expect(comparePourFields(null, [])).toEqual([]);
  });
  it("keeps identical fields quiet when only one field changed", () => {
    const rows = comparePourFields([pourA1], [{ ...pourA1, amount_g: 45 }]);
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(byLabel["Pour 1 amount"].changed).toBe(true);
    expect(byLabel["Pour 1 time"].changed).toBe(false);
    expect(byLabel["Pour 1 pattern"].changed).toBe(false);
  });
});

describe("pourCountAndTotal", () => {
  it("counts complete pours and sums their amounts", () => {
    expect(pourCountAndTotal([
      { time: "0:00", amount: "40", bloom: true, pattern: "center", note: "" },
      { time: "0:35", amount: "60", bloom: false, pattern: "circular", note: "" },
    ])).toEqual({ count: 2, totalG: 100 });
  });
  it("ignores half-filled rows", () => {
    expect(pourCountAndTotal([
      { time: "0:00", amount: "", bloom: false, pattern: "center", note: "" },
      { time: "soon", amount: "60", bloom: false, pattern: "center", note: "" },
    ])).toEqual({ count: 0, totalG: 0 });
  });
  it("rounds fractional sums sanely", () => {
    expect(pourCountAndTotal([
      { time: "0:00", amount: "40.5", bloom: false, pattern: "center", note: "" },
      { time: "0:35", amount: "60.25", bloom: false, pattern: "center", note: "" },
    ])).toEqual({ count: 2, totalG: 100.8 });
  });
});

describe("formatPourTotal", () => {
  it("renders the read-only counter line", () => {
    expect(formatPourTotal(2, 100)).toBe("2 pours · 100 g total");
    expect(formatPourTotal(1, 40)).toBe("1 pour · 40 g total");
  });
  it("returns null when there is nothing to count", () => {
    expect(formatPourTotal(0, 0)).toBeNull();
  });
});
