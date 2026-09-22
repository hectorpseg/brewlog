import { describe, expect, it } from "vitest";
import { matchBrew, matchCoffee, matchCupping } from "@/lib/domain/search";

describe("matchBrew", () => {
  const brew = {
    dose_g: 15,
    water_g: 225,
    notes: "Sweet finish",
    brewed_at: "2026-09-20T12:00:00.000Z",
    created_at: "2026-09-20T12:00:00.000Z",
    coffees: { name: "Competencia" },
    sessions: { title: "Phase 1" },
    observations: [{ hot_notes: "Berries", acidity: "bright" }],
  };
  it("matches coffee, session, notes, and observation text", () => {
    expect(matchBrew(brew, "competencia")).toBe(true);
    expect(matchBrew(brew, "PHASE 1")).toBe(true);
    expect(matchBrew(brew, "sweet")).toBe(true);
    expect(matchBrew(brew, "berries")).toBe(true);
    expect(matchBrew(brew, "bright")).toBe(true);
  });
  it("matches calendar days in ISO or display form", () => {
    expect(matchBrew(brew, "2026-09-20")).toBe(true);
    expect(matchBrew(brew, "Sep 20")).toBe(true);
  });
  it("rejects non-matching queries and matches everything on empty", () => {
    expect(matchBrew(brew, "naturals")).toBe(false);
    expect(matchBrew(brew, "")).toBe(true);
    expect(matchBrew(brew, "   ")).toBe(true);
  });
  it("handles array relations and missing fields", () => {
    expect(matchBrew({ coffees: [{ name: "Washed" }] }, "washed")).toBe(true);
    expect(matchBrew({}, "x")).toBe(false);
    expect(matchBrew({}, "")).toBe(true);
  });
});

describe("matchCoffee", () => {
  const coffee = { name: "La Palma", origin: "Colombia", process: "Washed", notes: "Backup bag" };
  it("matches name, origin, process, and notes", () => {
    expect(matchCoffee(coffee, "palma")).toBe(true);
    expect(matchCoffee(coffee, "colombia")).toBe(true);
    expect(matchCoffee(coffee, "washed")).toBe(true);
    expect(matchCoffee(coffee, "backup")).toBe(true);
    expect(matchCoffee(coffee, "natural")).toBe(false);
  });
});

describe("matchCupping", () => {
  const cupping = {
    cupped_at: "2026-09-18T12:00:00.000Z",
    grinder: "K-Ultra",
    grind_clicks: 85,
    notes: "Round and sweet",
    hot_notes: "Floral",
    coffees: { name: "Competencia" },
  };
  it("matches coffee, date, grinder, clicks, and final take", () => {
    expect(matchCupping(cupping, "competencia")).toBe(true);
    expect(matchCupping(cupping, "2026-09-18")).toBe(true);
    expect(matchCupping(cupping, "k-ultra")).toBe(true);
    expect(matchCupping(cupping, "85")).toBe(true);
    expect(matchCupping(cupping, "round")).toBe(true);
    expect(matchCupping(cupping, "floral")).toBe(true);
    expect(matchCupping(cupping, "peachy")).toBe(false);
  });
});
