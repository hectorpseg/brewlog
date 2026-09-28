import { describe, expect, it } from "vitest";
import {
  brewRecentItem,
  coffeeRecentItem,
  MAX_RECENT,
  recentHref,
  sessionRecentItem,
} from "@/lib/domain/recent-views";

describe("recentHref", () => {
  it("routes each entity to its detail page", () => {
    expect(recentHref("brew", "b1")).toBe("/brews/b1");
    expect(recentHref("coffee", "c1")).toBe("/coffees/c1");
    expect(recentHref("session", "s1")).toBe("/sessions/s1");
  });
  it("caps the log at ten", () => {
    expect(MAX_RECENT).toBe(10);
  });
});

describe("recent item shaping", () => {
  it("reads brew ratio + coffee first, date as fallback", () => {
    expect(
      brewRecentItem(
        { id: "b1", dose_g: 15, water_g: 225, brewed_at: "2026-09-21T12:00:00.000Z", created_at: "", coffee_name: "Tabi" },
        "2026-09-22T00:00:00.000Z",
      ),
    ).toMatchObject({ type: "brew", href: "/brews/b1", title: "1:15 · Tabi" });
    expect(
      brewRecentItem({ id: "b2", dose_g: null, water_g: null, brewed_at: "", created_at: "", coffee_name: "" }, "x"),
    ).toMatchObject({ title: "Brew" });
  });
  it("reads coffee name + remaining, degrades gracefully", () => {
    expect(coffeeRecentItem({ id: "c1", name: "Tabi", remaining_weight_g: 137 }, "x")).toMatchObject({
      title: "Tabi · ~137 g",
    });
    expect(coffeeRecentItem({ id: "c2", name: "", remaining_weight_g: null }, "x")).toMatchObject({ title: "Coffee" });
  });
  it("reads session titles", () => {
    expect(sessionRecentItem({ id: "s1", title: "Phase 1" }, "x")).toMatchObject({
      type: "session",
      href: "/sessions/s1",
      title: "Phase 1",
    });
  });
  it("rejects rows without ids", () => {
    expect(brewRecentItem({ id: "", dose_g: 1, water_g: 1, brewed_at: "", created_at: "", coffee_name: "" }, "x")).toBeNull();
    expect(coffeeRecentItem({ id: null, name: "x", remaining_weight_g: 1 }, "x")).toBeNull();
    expect(sessionRecentItem({ id: undefined, title: "x" }, "x")).toBeNull();
  });
});
