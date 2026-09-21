import { describe, expect, it } from "vitest";
import { splitSeconds, toSeconds } from "@/lib/domain/brew-time";

describe("brew time conversion", () => {
  it("splits stored seconds for display, including legacy values", () => {
    expect(splitSeconds(150)).toEqual({ minutes: 2, seconds: 30 });
    expect(splitSeconds(162)).toEqual({ minutes: 2, seconds: 42 });
    expect(splitSeconds(45)).toEqual({ minutes: 0, seconds: 45 });
    expect(splitSeconds(0)).toEqual({ minutes: 0, seconds: 0 });
  });

  it("yields empty fields when nothing was recorded", () => {
    expect(splitSeconds(undefined)).toEqual({});
    expect(splitSeconds(null)).toEqual({});
    expect(splitSeconds(-5)).toEqual({});
  });

  it("combines minutes + seconds back to stored seconds", () => {
    expect(toSeconds(2, 30)).toBe(150);
    expect(toSeconds(3, 45)).toBe(225);
    expect(toSeconds(undefined, undefined)).toBeUndefined();
    expect(toSeconds(undefined, 30)).toBe(30);
  });

  it("clamps seconds to the valid 0–59 range", () => {
    expect(toSeconds(2, 99)).toBe(2 * 60 + 59);
    expect(toSeconds(-1, 10)).toBeUndefined();
  });
});
