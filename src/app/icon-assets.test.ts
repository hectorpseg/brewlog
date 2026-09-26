import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function pngSize(p: string): { w: number; h: number } {
  const b = readFileSync(join(root, p));
  expect(b.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// Brand assets derive from public/app-icon.png (approved artwork, do not redraw).
// This pins their existence and dimensions so a missing/regenerated asset fails fast.
describe("icon assets", () => {
  it("keeps the approved source artwork", () => {
    expect(existsSync(join(root, "public/app-icon.png"))).toBe(true);
    expect(statSync(join(root, "public/app-icon.png")).size).toBeGreaterThan(10_000);
  });
  it("ships sized PWA + app icons", () => {
    expect(pngSize("public/icon-192.png")).toEqual({ w: 192, h: 192 });
    expect(pngSize("public/icon-512.png")).toEqual({ w: 512, h: 512 });
    expect(pngSize("public/icon-maskable.png")).toEqual({ w: 512, h: 512 });
    expect(pngSize("public/apple-touch-icon.png")).toEqual({ w: 180, h: 180 });
    expect(pngSize("src/app/icon.png")).toEqual({ w: 512, h: 512 });
    expect(pngSize("src/app/apple-icon.png")).toEqual({ w: 180, h: 180 });
  });
  it("derives every platform icon from one canonical artwork", () => {
    // Next.js routes and public manifest/iOS files must stay byte-identical
    // so browser, PWA, and Home Screen can never drift apart again.
    for (const [a, b] of [
      ["src/app/icon.png", "public/icon-512.png"],
      ["src/app/apple-icon.png", "public/apple-touch-icon.png"],
    ] as const) {
      expect(readFileSync(join(root, a)).equals(readFileSync(join(root, b)))).toBe(true);
    }
  });
  it("ships a multi-size favicon", () => {
    const p = join(root, "src/app/favicon.ico");
    expect(existsSync(p)).toBe(true);
    const b = readFileSync(p);
    expect(b.readUInt16LE(0)).toBe(0);
    expect(b.readUInt16LE(2)).toBe(1);
    expect(b.readUInt16LE(4)).toBeGreaterThanOrEqual(2);
  });
});
