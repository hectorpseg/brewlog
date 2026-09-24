import { describe, expect, it } from "vitest";
import { defaultBrewedDate, formatBrewDate, formatReceived, toBrewedAtIso, toDateInputValue } from "@/lib/domain/brew-date";
import { brewLifecycle, brewWarnings, BREW_LIFECYCLE_LABEL } from "@/lib/domain/brew-status";
import { describeDeletion } from "@/lib/domain/deletion";

describe("brew date", () => {
  it("pins a calendar day to noon UTC", () => {
    expect(toBrewedAtIso("2026-09-21")).toBe("2026-09-21T12:00:00.000Z");
  });
  it("rejects absent or malformed input (caller falls back to now())", () => {
    expect(toBrewedAtIso(undefined)).toBeUndefined();
    expect(toBrewedAtIso("")).toBeUndefined();
    expect(toBrewedAtIso("21/09/2026")).toBeUndefined();
    expect(toBrewedAtIso("2026-13-40")).toBe("2026-13-40T12:00:00.000Z");
  });
  it("defaults to the user's local today", () => {
    expect(defaultBrewedDate(new Date(2026, 8, 21, 23, 59))).toBe("2026-09-21");
    expect(defaultBrewedDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("formats for history display and date inputs", () => {
    expect(formatBrewDate("2026-09-21T12:00:00.000Z")).toMatch(/Sep.*21|21.*Sep/);
    expect(formatBrewDate(null)).toBe("-");
    expect(formatBrewDate("garbage")).toBe("-");
    expect(toDateInputValue("2026-09-21T12:00:00.000Z")).toBe("2026-09-21");
    expect(toDateInputValue(null)).toBe("");
  });
  it("pretty-prints ISO received dates and passes free text through", () => {
    expect(formatReceived("2026-09-19")).toMatch(/Sep.*19|19.*Sep/);
    expect(formatReceived("last week")).toBe("last week");
    expect(formatReceived(null)).toBe("unknown");
  });
});

describe("brew lifecycle", () => {
  const core = { temp_c: 92, grind_clicks: 70 };
  it("tasted when any observation content exists, regardless of recipe gaps", () => {
    expect(brewLifecycle({}, { hot_notes: "Sweet." })).toBe("tasted");
    expect(brewLifecycle({}, [{ acidity: "medium" }])).toBe("tasted");
    expect(brewLifecycle(core, { acidity: "low", hot_notes: "" })).toBe("tasted");
  });
  it("brewed when core recipe present but nothing tasted", () => {
    expect(brewLifecycle(core, null)).toBe("brewed");
    expect(brewLifecycle(core, {})).toBe("brewed");
    expect(brewLifecycle(core, { acidity: "", hot_notes: "" })).toBe("brewed");
  });
  it("in progress when core recipe incomplete and untasted", () => {
    expect(brewLifecycle({}, null)).toBe("in-progress");
    expect(brewLifecycle({ temp_c: 92 }, null)).toBe("in-progress");
    expect(brewLifecycle({ grind_clicks: 70 }, null)).toBe("in-progress");
  });
  it("never requires beverage, session, or time for completion", () => {
    expect(brewLifecycle(core, { freeform_notes: "x" })).toBe("tasted");
    expect(BREW_LIFECYCLE_LABEL["in-progress"]).toBe("In progress");
  });
  it("warns separately about time and session, never as status", () => {
    expect(brewWarnings({})).toEqual(["No brew time", "No session"]);
    expect(brewWarnings({ total_time_sec: 150, session_id: "s" })).toEqual([]);
    expect(brewWarnings({ total_time_sec: 150 })).toEqual(["No session"]);
  });
});

describe("describeDeletion", () => {
  it("states brew consequences: notes die, experiments unlink", () => {
    const d = describeDeletion("brew", { observations: 1, experiments: 2 });
    expect(d.body).toContain("1 tasting note set");
    expect(d.body).toContain("permanently deleted");
    expect(d.body).toContain("kept but unlinked");
    expect(d.confirm).toBe("Delete brew");
  });
  it("states brew consequences: structured tasting entries die with the brew", () => {
    const d = describeDeletion("brew", { observations: 1, tastings: 3, experiments: 0 });
    expect(d.body).toContain("3 tasting entries");
    expect(d.body).toContain("permanently deleted");
  });
  it("states coffee consequences: brews die with their notes", () => {
    const d = describeDeletion("coffee", { brews: 3, observations: 2 });
    expect(d.body).toContain("3 brews");
    expect(d.body).toContain("2 tasting note sets");
  });
  it("states session consequences: brews survive unassigned", () => {
    const d = describeDeletion("session", { brews: 4 });
    expect(d.body).toContain("stay in history, unassigned");
  });
  it("states experiment consequences: brews kept", () => {
    const d = describeDeletion("experiment", {});
    expect(d.body).toContain("Linked brews are kept in history");
  });
  it("states cupping consequences: only the tasting record goes", () => {
    const d = describeDeletion("cupping", {});
    expect(d.body).toContain("Only this tasting record is removed");
    expect(d.confirm).toBe("Delete cupping");
  });
});
