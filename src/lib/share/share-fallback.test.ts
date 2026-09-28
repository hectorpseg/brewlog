import { describe, expect, it } from "vitest";
import { canNativeShareImage, canNativeShareText } from "@/lib/share/share-card";

// Capability guards decide the share fallback chain (native file share ->
// PNG download -> clipboard text). Without browser share APIs every guard
// must report false so callers always take a fallback, never a dead tap.
describe("share capability guards", () => {
  it("report no native share outside a share-capable browser", () => {
    expect(canNativeShareText()).toBe(false);
    expect(canNativeShareImage()).toBe(false);
  });
});
