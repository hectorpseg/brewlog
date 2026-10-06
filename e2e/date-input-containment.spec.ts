import { test, expect } from "@playwright/test";

// Date-input containment regression: the native date control must stay inside
// its grid cell, card, and the page viewport at phone widths. Covers the
// brew-recording form and the cupping form (the two complaint surfaces).
// Read-only: navigates and measures, never submits. Skipped without dev user
// credentials (same convention as the other authenticated specs).
test("date inputs stay contained in the brew and cupping forms", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "no dev user credentials");
  await page.goto("/login").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/coffees|brews/, { timeout: 15_000 });

  for (const path of ["/brews/new", "/cuppings/new"]) {
    for (const width of [320, 350, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path).catch(() => {});
      await page.waitForLoadState("domcontentloaded");
      const overflowing = await page.evaluate(() => {
        const bad = [] as string[];
        for (const input of document.querySelectorAll('input[type="date"]')) {
          const cell = input.parentElement;
          const card = input.closest(".rounded-\\[10px\\]");
          const ir = input.getBoundingClientRect();
          if (cell && ir.right > cell.getBoundingClientRect().right + 0.5) bad.push("cell");
          if (card && ir.right > card.getBoundingClientRect().right + 0.5) bad.push("card");
        }
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) bad.push("page");
        return bad;
      });
      expect(overflowing, `date input overflow on ${path} at ${width}px`).toEqual([]);
    }
  }
});
