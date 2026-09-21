import { describe, expect, it } from "vitest";
import {
  SEED_BREWS,
  SEED_COFFEES,
  SEED_EXPERIMENTS,
  SEED_OBSERVATIONS,
  SEED_SESSIONS,
  SENSORY_LEVELS,
  SEED_PREFIX,
} from "@/lib/seed/demo-data";
import { coffeeSchema, sessionSchema } from "@/lib/validation/schemas";

const levels = new Set<string>(SENSORY_LEVELS);

describe("seed integrity", () => {
  it("has enough volume to exercise history/detail/compare", () => {
    expect(SEED_COFFEES.length).toBeGreaterThanOrEqual(3);
    expect(SEED_BREWS.length).toBeGreaterThanOrEqual(5);
    expect(SEED_OBSERVATIONS.length).toBeGreaterThanOrEqual(3);
    expect(SEED_EXPERIMENTS.length).toBeGreaterThanOrEqual(3);
  });

  it("uses stable Seed-prefixed names (idempotency keys)", () => {
    for (const c of SEED_COFFEES) expect(c.name.startsWith(SEED_PREFIX)).toBe(true);
    for (const s of SEED_SESSIONS) expect(s.title.startsWith(SEED_PREFIX)).toBe(true);
    expect(new Set(SEED_COFFEES.map((c) => c.name)).size).toBe(SEED_COFFEES.length);
    expect(new Set(SEED_BREWS.map((b) => b.slug)).size).toBe(SEED_BREWS.length);
  });

  it("every foreign key resolves within the seed", () => {
    const coffees = new Set(SEED_COFFEES.map((c) => c.slug));
    const sessions = new Set(SEED_SESSIONS.map((s) => s.slug));
    const brews = new Set(SEED_BREWS.map((b) => b.slug));
    for (const b of SEED_BREWS) {
      expect(coffees.has(b.coffeeSlug)).toBe(true);
      if (b.sessionSlug) expect(sessions.has(b.sessionSlug)).toBe(true);
    }
    for (const o of SEED_OBSERVATIONS) expect(brews.has(o.brewSlug)).toBe(true);
    expect(new Set(SEED_OBSERVATIONS.map((o) => o.brewSlug)).size).toBe(SEED_OBSERVATIONS.length);
    for (const e of SEED_EXPERIMENTS) {
      if (e.brewSlug) expect(brews.has(e.brewSlug)).toBe(true);
      if (e.sessionSlug) expect(sessions.has(e.sessionSlug)).toBe(true);
    }
  });

  it("leaves empty/partial states (a coffee with no brews, brews with no observations)", () => {
    const brewed = new Set(SEED_BREWS.map((b) => b.coffeeSlug));
    expect(SEED_COFFEES.some((c) => !brewed.has(c.slug))).toBe(true);
    const observed = new Set(SEED_OBSERVATIONS.map((o) => o.brewSlug));
    expect(SEED_BREWS.some((b) => !observed.has(b.slug))).toBe(true);
  });

  it("varies recipes across brews", () => {
    expect(new Set(SEED_BREWS.map((b) => b.grindClicks)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(SEED_BREWS.map((b) => b.filter)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(SEED_BREWS.map((b) => b.waterSource)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(SEED_BREWS.map((b) => b.tempC)).size).toBeGreaterThanOrEqual(2);
  });

  it("observation levels use the app's vocabulary", () => {
    const keys = ["acidity", "sweetness", "body", "clarity", "bitterness", "astringency", "intensity", "balance", "finish"] as const;
    for (const o of SEED_OBSERVATIONS) {
      for (const k of keys) {
        const v = o[k];
        if (v !== undefined) expect(levels.has(v)).toBe(true);
      }
    }
  });

  it("seed coffees/sessions pass app validation", () => {
    for (const c of SEED_COFFEES) {
      expect(
        coffeeSchema.safeParse({
          name: c.name, origin: c.origin, process: c.process,
          roastDate: c.roastDate, receivedDate: c.receivedDate,
          initialWeightG: c.initialWeightG, remainingWeightG: c.remainingWeightG, notes: c.notes,
        }).success,
      ).toBe(true);
    }
    for (const s of SEED_SESSIONS) {
      expect(sessionSchema.safeParse({ title: s.title, notes: s.notes }).success).toBe(true);
    }
  });

  it("keeps observation separate from diagnosis", () => {
    const blob = JSON.stringify([...SEED_OBSERVATIONS, ...SEED_EXPERIMENTS]).toLowerCase();
    expect(blob).not.toMatch(/underextracted|overextracted|under-extracted/);
  });
});
