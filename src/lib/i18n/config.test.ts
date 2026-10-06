import { describe, expect, it } from "vitest";
import { isLocale, resolveLocale } from "@/lib/i18n/config";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";

describe("resolveLocale", () => {
  it("prefers an explicit cookie over the browser header", () => {
    expect(resolveLocale("en", "es-ES,es;q=0.9")).toBe("en");
    expect(resolveLocale("es", "en-US,en;q=0.9")).toBe("es");
  });

  it("detects Spanish from the preferred Accept-Language tag", () => {
    expect(resolveLocale(undefined, "es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(resolveLocale(undefined, "es")).toBe("es");
    expect(resolveLocale(undefined, "es;q=0.5,en;q=0.9")).toBe("en");
    expect(resolveLocale(undefined, "en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(resolveLocale(undefined, null)).toBe("en");
  });

  it("ignores unknown cookie values", () => {
    expect(isLocale("fr")).toBe(false);
    expect(resolveLocale("fr", "es")).toBe("es");
  });
});

describe("depleted-coffee labels", () => {
  it("provides English and Spanish labels for the new filter and empty states", () => {
    for (const dict of Object.values(DICTIONARIES)) {
      expect(dict["coffee.filter.available"]).toBeTruthy();
      expect(dict["coffee.filter.depleted"]).toBeTruthy();
      expect(dict["coffee.empty.depleted.title"]).toBeTruthy();
      expect(dict["coffee.empty.depleted.body"]).toBeTruthy();
      expect(dict["coffee.depletedBadge"]).toBeTruthy();
      expect(dict["coffee.depletedGroup"]).toBeTruthy();
    }
  });
});
