import { describe, expect, it } from "vitest";
import { canNativeShareImage } from "@/lib/share/share-card";

// The capability guard decides the share fallback chain (native file share ->
// PNG download -> clipboard text). Without browser share APIs it must report
// false so callers always take a fallback, never a dead tap.
describe("share capability guards", () => {
  it("report no native share outside a share-capable browser", () => {
    expect(canNativeShareImage()).toBe(false);
  });
});
