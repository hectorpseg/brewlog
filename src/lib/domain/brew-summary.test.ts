import { describe, expect, it } from "vitest";
import { formatBrewSummary } from "@/lib/domain/brew-summary";

const brew = {
  id: "b1",
  user_id: "u1",
  coffee_id: "c1",
  dose_g: 15,
  water_g: 250,
  brewed_at: "2026-09-21T12:00:00.000Z",
  created_at: "2026-09-21T12:00:00.000Z",
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
  session_id: "s1",
};

const observation = {
  hot_notes: "Sweet, bright.",
  warm_notes: null,
  cold_notes: "Clean.",
  freeform_notes: "Best cup this week.",
};

const tastings = [
  { stage: "hot", attribute: "Body", value: 4 },
  { stage: "hot", attribute: "finish", value: 2 },
  { stage: "warm", attribute: "sweetness", value: 8 },
];

describe("formatBrewSummary", () => {
  it("renders the canonical deterministic summary", () => {
    const text = formatBrewSummary({
      brew,
      coffeeName: "Competencia",
      sessionTitle: "Phase 1",
      observation,
      tastings,
      experiments: [{ status: "answered" }, { status: "open" }],
    });
    expect(text).toBe(
      [
        "Competencia · Sep 21",
        "15 g dose · 250 g water (1:16.7) · 92°C · 70 clicks · K-Ultra · Origami · Abaca · Scala · 4 pours · 2:30 · 180 g out",
        "Session: Phase 1",
        "Tasting — Hot: body 4, finish 2; Warm: sweetness 8",
        "Hot notes: Sweet, bright.",
        "Cold notes: Clean.",
        "Overall: Best cup this week.",
        "Brew notes: good",
        "Experiments: 2 (1 answered)",
      ].join("\n"),
    );
    // same input twice, same string — no randomness, no timestamps
    expect(formatBrewSummary({
      brew, coffeeName: "Competencia", sessionTitle: "Phase 1",
      observation, tastings, experiments: [{ status: "answered" }, { status: "open" }],
    })).toBe(text);
  });

  it("omits absent values and never leaks database IDs", () => {
    const text = formatBrewSummary({ brew: { dose_g: 15, water_g: 250 } });
    expect(text).toBe("Brew\n15 g dose · 250 g water (1:16.7)");
    expect(text).not.toContain("b1");
    expect(text).not.toContain("u1");
  });

  it("includes structured pours in sequence order when present", () => {
    const text = formatBrewSummary({
      brew,
      coffeeName: "Competencia",
      pours: [
        { sequence: 2, amount_g: 60, timing_seconds: 35, bloom: false, pattern: "circular", note: "" },
        { sequence: 1, amount_g: 40, timing_seconds: 0, bloom: true, pattern: "center", note: null },
      ],
    });
    expect(text).toContain("Pours: 1. 0:00 · 40 g · center · bloom; 2. 0:35 · 60 g · circular");
  });

  it("omits the pours line for historical brews without structured pours", () => {
    expect(formatBrewSummary({ brew })).not.toContain("Pours:");
    expect(formatBrewSummary({ brew, pours: [] })).not.toContain("Pours:");
    expect(formatBrewSummary({ brew, pours: [{ sequence: 1 }] })).not.toContain("Pours:");
  });

  it("orders tastings deterministically regardless of input order", () => {
    const shuffled = [
      { stage: "warm", attribute: "sweetness", value: 8 },
      { stage: "hot", attribute: "finish", value: 2 },
      { stage: "hot", attribute: "body", value: 4 },
    ];
    const text = formatBrewSummary({ brew, tastings: shuffled });
    expect(text).toContain("Tasting — Hot: body 4, finish 2; Warm: sweetness 8");
    expect(formatBrewSummary({ brew, tastings: [...shuffled].reverse() })).toBe(text);
  });
  it("skips garbage tasting rows and reports open experiments plainly", () => {
    const text = formatBrewSummary({
      brew,
      tastings: [
        { stage: "lukewarm", attribute: "x", value: 5 },
        { stage: "hot", attribute: "", value: 5 },
        { stage: "hot", attribute: "ok", value: "lots" },
      ],
      experiments: [{ status: "open" }],
    });
    expect(text).not.toContain("Tasting");
    expect(text).toContain("Experiments: 1 (open)");
  });
  it("omits the experiments line for historical brews with none linked", () => {
    const text = formatBrewSummary({ brew, observation });
    expect(text).not.toContain("Experiments");
  });
});
