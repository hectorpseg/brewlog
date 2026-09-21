import { test, expect } from "@playwright/test";

// ponytail: responsive guard — public/redirect routes render without overflow
// at iPhone widths. Authenticated routes redirect to /login without keys,
// so this runs green with or without Supabase configured.
for (const width of [375, 390, 430]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/login", "/brews", "/coffees/new", "/nope"]) {
      // server redirects (e.g. to /login?next=) interrupt navigation; settle instead
      await page.goto(path).catch(() => {});
      await page.waitForLoadState("domcontentloaded");
      const overflow = await page.evaluate(
        () => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}
