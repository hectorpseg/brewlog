import { describe, expect, it } from "vitest";
import { formatCompareSummary, compareBrewDates } from "@/lib/domain/compare-summary";

// The page assembles changed rows from scalars; a fact-only summary just
// reshapes them. Not a total ordering guarantee test — but worth a look.
describe("formatCompareSummary", () => {
  it("shows one block per brew with recorded fields only, then changed rows", () => {
    const scalars = [
      { Coffee: "Competencia", Ratio: "1:15", Dose: "15 g", "Starting temperature": "-", "Brew time": "2:42" } as Record<string, string>,
      { Coffee: "Washed", Ratio: "1:16", Dose: "17 g", "Starting temperature": "94°C", "Brew time": "-" } as Record<string, string>,
    ];
    const out = formatCompareSummary(scalars, ["Sep 20", "Sep 21"], [
      { label: "Dose", values: ["15 g", "17 g"], changed: true },
      { label: "Starting temperature", values: ["-", "94°C"], changed: true },
    ]);
    expect(out).toBe(
      [
        "Brew comparison (2)",
        "1) Competencia · Sep 20",
        "   1:15 · 15 g · 2:42",
        "2) Washed · Sep 21",
        "   1:16 · 17 g · 94°C",
        "",
        "Changed:",
        "- Dose: 15 g → 17 g",
        "- Starting temperature: - → 94°C",
      ].join("\n"),
    );
  });

  it("skips the Changed section when nothing differs", () => {
    const scalars = [{ Coffee: "A" } as Record<string, string>, { Coffee: "A" } as Record<string, string>];
    expect(formatCompareSummary(scalars, ["Sep 20", "Sep 21"], [])).toBe(
      "Brew comparison (2)\n1) A · Sep 20\n2) A · Sep 21",
    );
  });
});

describe("compareBrewDates", () => {
  it("falls back to created_at when brewed_at is null", () => {
    expect(
      compareBrewDates([
        { brewed_at: "2026-09-20T12:00:00.000Z", created_at: "2026-09-21T12:00:00.000Z" },
        { brewed_at: null, created_at: "2026-09-22T12:00:00.000Z" },
      ]),
    ).toEqual(["Sep 20", "Sep 22"]);
  });
});
