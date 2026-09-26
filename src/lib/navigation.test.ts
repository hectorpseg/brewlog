import { describe, expect, it } from "vitest";
import { isMorePath, isPublicPath, isTabPath, MORE_LINKS, PRIMARY_TABS } from "@/lib/navigation";

describe("navigation", () => {
  it("keeps primary tabs to the mid-brew workflow", () => {
    expect(PRIMARY_TABS.map((t) => t.href)).toEqual(["/brews", "/coffees", "/cuppings"]);
  });

  it("keeps experiments out of the primary tabs, one tap deep under More", () => {
    expect(PRIMARY_TABS.map((t) => t.href).some((h) => h.startsWith("/experiments"))).toBe(false);
    expect(MORE_LINKS.map((l) => l.href)).toContain("/experiments");
  });

  it("keeps compare and sessions one tap deep under More", () => {
    expect(MORE_LINKS.map((l) => l.href)).toContain("/brews/compare");
    expect(MORE_LINKS.map((l) => l.href)).toContain("/sessions");
  });

  it("hides app chrome on public paths only", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/forgot-password")).toBe(true);
    expect(isPublicPath("/update-password")).toBe(true);
    expect(isPublicPath("/brews")).toBe(false);
    expect(isPublicPath("/brews/compare")).toBe(false);
    expect(isPublicPath("/coffees")).toBe(false);
  });

  it("marks overflow destinations as More", () => {
    expect(isMorePath("/more")).toBe(true);
    expect(isMorePath("/sessions/abc")).toBe(true);
    expect(isMorePath("/experiments/abc")).toBe(true);
    expect(isMorePath("/account")).toBe(true);
    expect(isMorePath("/brews")).toBe(false);
  });

  it("matches tabs with their children", () => {
    expect(isTabPath("/brews/abc", "/brews")).toBe(true);
    expect(isTabPath("/coffees", "/brews")).toBe(false);
  });
});
