import { afterEach, describe, expect, it } from "vitest";
import { canNativeShareImage, nativeShareText } from "@/lib/share/share-card";

// The capability guard decides the share fallback chain (native file share ->
// PNG download -> clipboard text). Without browser share APIs it must report
// false so callers always take a fallback, never a dead tap.
describe("share capability guards", () => {
  it("report no native share outside a share-capable browser", () => {
    expect(canNativeShareImage()).toBe(false);
  });
});

// Text share: "unsupported" without navigator.share so the caller copies to
// the clipboard instead; user-cancelled sheets count as shared, not errors.
describe("nativeShareText", () => {
  const nav = globalThis.navigator as Navigator & { share?: (d: ShareData) => Promise<void> };

  afterEach(() => {
    Reflect.deleteProperty(nav, "share");
  });

  it("reports unsupported when the browser has no share sheet", async () => {
    expect(await nativeShareText("title", "text")).toBe("unsupported");
  });

  it("shares through navigator.share when available", async () => {
    let got: ShareData | undefined;
    nav.share = async (d) => {
      got = d;
    };
    expect(await nativeShareText("title", "text")).toBe("shared");
    expect(got).toEqual({ title: "title", text: "text" });
  });

  it("treats an aborted share sheet as shared, not a failure", async () => {
    nav.share = () => Promise.reject(new DOMException("abort", "AbortError"));
    expect(await nativeShareText("title", "text")).toBe("shared");
  });

  it("propagates real share failures to the caller", async () => {
    nav.share = () => Promise.reject(new Error("boom"));
    await expect(nativeShareText("title", "text")).rejects.toThrow("boom");
  });
});
