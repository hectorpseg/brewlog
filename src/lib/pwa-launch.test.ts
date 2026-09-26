import { describe, expect, it } from "vitest";
import {
  BACKGROUND_IDLE_MS,
  LAUNCH_SPLASH_FADE_MS,
  LAUNCH_SPLASH_SHOW_MS,
  isStandalonePwa,
  shouldShowReentrySplash,
} from "@/lib/pwa-launch";

const no = () => false;
const yes = () => true;

describe("pwa-launch", () => {
  it("detects standalone via display-mode", () => {
    expect(isStandalonePwa({ matchDisplayMode: yes })).toBe(true);
  });

  it("detects iOS Home Screen PWA via navigator.standalone", () => {
    expect(isStandalonePwa({ matchDisplayMode: no, iosStandalone: true })).toBe(true);
  });

  it("stays off in normal browser tabs (desktop and mobile Safari)", () => {
    expect(isStandalonePwa({ matchDisplayMode: no })).toBe(false);
    expect(isStandalonePwa({ matchDisplayMode: no, iosStandalone: false })).toBe(false);
  });

  it("ignores short backgrounding, splashes after ~60s idle", () => {
    expect(shouldShowReentrySplash(0)).toBe(false);
    expect(shouldShowReentrySplash(59_999)).toBe(false);
    expect(shouldShowReentrySplash(BACKGROUND_IDLE_MS)).toBe(true);
    expect(shouldShowReentrySplash(BACKGROUND_IDLE_MS * 10)).toBe(true);
  });

  it("keeps the splash beat short and polished", () => {
    expect(LAUNCH_SPLASH_SHOW_MS).toBeGreaterThanOrEqual(500);
    expect(LAUNCH_SPLASH_SHOW_MS).toBeLessThanOrEqual(1000);
    expect(LAUNCH_SPLASH_FADE_MS).toBeLessThanOrEqual(300);
  });
});
