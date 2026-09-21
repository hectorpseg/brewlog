import { describe, expect, it } from "vitest";
import { loginUrl, safeNext } from "@/lib/auth";

describe("safeNext", () => {
  it("passes relative paths through", () => {
    expect(safeNext("/brews/abc")).toBe("/brews/abc");
  });
  it("falls back for missing, external, or protocol-relative targets", () => {
    expect(safeNext(null)).toBe("/coffees");
    expect(safeNext(undefined)).toBe("/coffees");
    expect(safeNext("")).toBe("/coffees");
    expect(safeNext("https://evil.example")).toBe("/coffees");
    expect(safeNext("//evil.example/brews")).toBe("/coffees");
  });
  it("builds a login url preserving the destination", () => {
    expect(loginUrl("/brews/abc")).toBe("/login?next=%2Fbrews%2Fabc");
  });
});
