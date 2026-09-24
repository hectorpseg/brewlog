import { describe, expect, it } from "vitest";
import {
  EXPERIMENT_BREW_SELECT,
  EXPERIMENT_DETAIL_SELECT,
  EXPERIMENT_STATUS_LABEL,
  experimentStatus,
  experimentTitle,
  formatExperimentSummary,
  isExperimentStatus,
  mergeBrewIdSet,
  mergeExperimentBrews,
} from "@/lib/domain/experiments";
import { cuppingSchema, experimentSchema } from "@/lib/validation/schemas";

describe("experimentStatus", () => {
  it("marks answered experiments", () => {
    expect(experimentStatus({ conclusion: "68 confirmed." })).toBe("answered");
    expect(experimentStatus({ actual_result: "Sweeter." })).toBe("answered");
  });
  it("marks open experiments", () => {
    expect(experimentStatus({})).toBe("open");
    expect(experimentStatus({ conclusion: "  " })).toBe("open");
    expect(experimentStatus({ actualResult: null })).toBe("open");
  });
});

describe("experimentSchema", () => {
  it("accepts a question without an answer yet", () => {
    const r = experimentSchema.safeParse({ hypothesis: "Finer grind extracts more." });
    expect(r.success).toBe(true);
  });
  it("accepts a brew link and a full record", () => {
    const r = experimentSchema.safeParse({
      brewId: "123e4567-e89b-12d3-a456-426614174000",
      hypothesis: "H",
      changedVariables: "Grind 70 → 68",
      expectedResult: "More body",
      actualResult: "More body",
      conclusion: "Confirmed",
      nextQuestion: "Ratio next?",
    });
    expect(r.success).toBe(true);
  });
  it("accepts the Wave 4 fields: title, status, notes", () => {
    const r = experimentSchema.safeParse({
      title: "Dialing in Origami pulse pattern",
      status: "in_progress",
      hypothesis: "Pulse pours even out extraction.",
      changedVariables: "3 vs 4 pulses",
      notes: "Same coffee, same grind.",
      conclusion: null,
    });
    expect(r.success).toBe(true);
  });
  it("accepts all three statuses and rejects anything else", () => {
    for (const status of ["planned", "in_progress", "evaluated"]) {
      expect(experimentSchema.safeParse({ status }).success).toBe(true);
    }
    expect(experimentSchema.safeParse({ status: "open" }).success).toBe(false);
    expect(experimentSchema.safeParse({ status: "answered" }).success).toBe(false);
    expect(experimentSchema.safeParse({ status: "" }).success).toBe(false);
  });
  it("rejects overlong titles but allows empty ones (untitled draft)", () => {
    expect(experimentSchema.safeParse({ title: "x".repeat(121) }).success).toBe(false);
    expect(experimentSchema.safeParse({ title: "" }).success).toBe(true);
  });
  it("accepts a partial Wave 4 update so historical rows stay editable", () => {
    // Only new fields sent: legacy columns arrive as undefined and are left
    // untouched by the update (undefined keys are stripped, never nulled).
    expect(experimentSchema.safeParse({ title: "T", status: "evaluated" }).success).toBe(true);
  });
  it("accepts an experiment with no brew at all", () => {
    expect(experimentSchema.safeParse({}).success).toBe(true);
    expect(experimentSchema.safeParse({ title: "Question only" }).success).toBe(true);
  });
});

describe("isExperimentStatus", () => {
  it("accepts only the three explicit states", () => {
    expect(isExperimentStatus("planned")).toBe(true);
    expect(isExperimentStatus("in_progress")).toBe(true);
    expect(isExperimentStatus("evaluated")).toBe(true);
    expect(isExperimentStatus("open")).toBe(false);
    expect(isExperimentStatus(null)).toBe(false);
    expect(isExperimentStatus(undefined)).toBe(false);
  });
  it("labels every status for display", () => {
    expect(EXPERIMENT_STATUS_LABEL.planned).toBe("planned");
    expect(EXPERIMENT_STATUS_LABEL.in_progress).toBe("in progress");
    expect(EXPERIMENT_STATUS_LABEL.evaluated).toBe("evaluated");
  });
});

describe("experimentTitle", () => {
  it("prefers the explicit title", () => {
    expect(experimentTitle({ title: "Pulse pattern", hypothesis: "H" })).toBe("Pulse pattern");
  });
  it("falls back to the hypothesis excerpt for legacy rows", () => {
    expect(experimentTitle({ title: null, hypothesis: "Finer grind extracts more." })).toBe(
      "Finer grind extracts more.",
    );
    expect(experimentTitle({ title: "  ", hypothesis: null })).toBe("Untitled experiment");
    expect(experimentTitle({})).toBe("Untitled experiment");
  });
});

describe("mergeExperimentBrews", () => {
  const a = { id: "a" };
  const b = { id: "b" };
  it("merges junction links with the legacy single link, deduped", () => {
    expect(mergeExperimentBrews([a, b], b)).toEqual([a, b]);
    expect(mergeExperimentBrews([], a)).toEqual([a]);
    expect(mergeExperimentBrews([a], null)).toEqual([a]);
    expect(mergeExperimentBrews([], undefined)).toEqual([]);
  });
  it("accepts a legacy array join the way Supabase returns it", () => {
    expect(mergeExperimentBrews([a], [b])).toEqual([a, b]);
  });
});

describe("mergeBrewIdSet", () => {
  it("keeps a legacy brew_id visible with no junction row (pre-backfill)", () => {
    expect(mergeBrewIdSet([], "legacy-brew")).toEqual(["legacy-brew"]);
  });
  it("serves a new junction-only experiment", () => {
    expect(mergeBrewIdSet(["b1", "b2"], null)).toEqual(["b1", "b2"]);
  });
  it("dedupes a backfilled brew present in both places", () => {
    expect(mergeBrewIdSet(["b1"], "b1")).toEqual(["b1"]);
  });
  it("stays empty for experiments without any brew", () => {
    expect(mergeBrewIdSet([], null)).toEqual([]);
    expect(mergeBrewIdSet([], undefined)).toEqual([]);
  });
});

describe("EXPERIMENT_BREW_SELECT", () => {
  it("covers every field the linked-brew card reads (slim-projection regression)", () => {
    // BrewCard renders dose, water, temp, clicks, time, filter, session_id
    // and observations. Dropping any of them renders false "?", "No brew
    // time", "No session" or "In progress" signals for data the brew has.
    for (const field of [
      "dose_g", "water_g", "temp_c", "grind_clicks", "total_time_sec",
      "filter", "session_id", "brewed_at", "created_at",
      "coffees(name)", "observations(*)",
    ]) {
      expect(EXPERIMENT_BREW_SELECT).toContain(field);
    }
  });
});

describe("EXPERIMENT_DETAIL_SELECT", () => {
  it("pins the disambiguated legacy brew embed (PGRST201 regression)", () => {
    // Since 0009 PostgREST sees two experiments→brews paths (legacy FK plus
    // the many-to-many through experiment_brews) and rejects a bare `brews`
    // embed. The hint is what keeps legacy detail pages loading.
    expect(EXPERIMENT_DETAIL_SELECT).toContain("brews!experiments_brew_id_fkey");
    expect(EXPERIMENT_DETAIL_SELECT).not.toMatch(/(^|[, ])brews\(/);
  });
});

describe("formatExperimentSummary", () => {
  it("renders stored data only, in a fixed order", () => {
    const text = formatExperimentSummary({
      title: "Pulse pattern",
      status: "in progress",
      hypothesis: "Pulse pours even out extraction.",
      changed_variables: "3 vs 4 pulses",
      notes: "Same coffee.",
      conclusion: "4 pulses confirmed.",
      brews: [
        { dose_g: 15, water_g: 225, coffees: { name: "Comp Lot" } },
        { dose_g: 15, water_g: 225, coffees: [{ name: "Comp Lot" }] },
      ],
    });
    expect(text).toBe(
      [
        "Experiment",
        "Title: Pulse pattern",
        "Status: in progress",
        "Hypothesis: Pulse pours even out extraction.",
        "Variables: 3 vs 4 pulses",
        "Brews: 2",
        "- Comp Lot · 15 g / 225 g",
        "- Comp Lot · 15 g / 225 g",
        "Notes: Same coffee.",
        "Conclusion: 4 pulses confirmed.",
      ].join("\n"),
    );
  });
  it("omits an empty conclusion and reports zero brews", () => {
    const text = formatExperimentSummary({
      title: "Grind test",
      status: "planned",
      hypothesis: "Finer is sweeter.",
      brews: [],
      conclusion: "  ",
    });
    expect(text).not.toContain("Conclusion:");
    expect(text).toContain("Brews: 0");
  });
  it("never invents data for historical rows without new fields", () => {
    const text = formatExperimentSummary({ hypothesis: "Old question." });
    expect(text).toBe(["Experiment", "Title: Old question.", "Hypothesis: Old question.", "Brews: 0"].join("\n"));
  });
});

describe("cuppingSchema", () => {
  const coffeeId = "123e4567-e89b-12d3-a456-426614174000";
  it("accepts a minimal cupping: coffee + date", () => {
    const r = cuppingSchema.safeParse({ coffeeId, cuppedAt: "2026-09-21" });
    expect(r.success).toBe(true);
  });
  it("accepts prep info and sensory notes, all optional", () => {
    const r = cuppingSchema.safeParse({
      coffeeId,
      cuppedAt: "2026-09-21",
      doseG: 10,
      waterG: 200,
      grind: "coarse",
      hotNotes: "Floral.",
      warmNotes: "Sweet.",
      coldNotes: "Clean.",
      notes: "Baseline before brews.",
    });
    expect(r.success).toBe(true);
  });
  it("rejects missing coffee and malformed dates", () => {
    expect(cuppingSchema.safeParse({ cuppedAt: "2026-09-21" }).success).toBe(false);
    expect(cuppingSchema.safeParse({ coffeeId, cuppedAt: "last Tuesday" }).success).toBe(false);
    expect(cuppingSchema.safeParse({ coffeeId, cuppedAt: "" }).success).toBe(true);
  });
  it("accepts grinder + clicks for reproducible prep, both optional", () => {
    const r = cuppingSchema.safeParse({
      coffeeId,
      cuppedAt: "2026-09-21",
      grinder: "K-Ultra",
      grindClicks: 85,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.grinder).toBe("K-Ultra");
      expect(r.data.grindClicks).toBe(85);
    }
    expect(cuppingSchema.safeParse({ coffeeId, grinder: "", grindClicks: "" }).success).toBe(true);
    expect(cuppingSchema.safeParse({ coffeeId, grindClicks: 999 }).success).toBe(false);
  });
});
