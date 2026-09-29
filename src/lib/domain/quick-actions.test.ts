import { describe, expect, it } from "vitest";
import { copyNextBrewHref } from "@/lib/domain/quick-actions";

// ponytail: the copy-as-next-brew target is the one S7 behavior worth
// pinning: every quick action (brews list copy, coffees list brew) must land
// on the existing copy flow, never a new duplicate.
describe("copyNextBrewHref", () => {
  it("targets the existing copy flow for the coffee", () => {
    expect(copyNextBrewHref("abc-123")).toBe("/brews/new?coffee=abc-123&copy=1");
  });

  it("encodes coffee ids instead of breaking the URL", () => {
    expect(copyNextBrewHref("a/b?c=d")).toBe("/brews/new?coffee=a%2Fb%3Fc%3Dd&copy=1");
  });

  it("targets the specific brew when a brewId is provided", () => {
    expect(copyNextBrewHref("abc-123", "brew-1")).toBe("/brews/new?brew=brew-1&copy=1");
  });
});
