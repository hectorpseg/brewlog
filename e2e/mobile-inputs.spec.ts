import { test, expect } from "@playwright/test";

// Mobile input regression for the brew workflow, at phone viewport sizes.
// Read-only by design: navigates, opens client-side draft rows, and asserts
// rendered controls. Nothing is submitted, so no brew/tasting records are
// created. Skipped without dev user credentials (same convention as the
// brew-flow spec). The Playwright config already uses the iPhone 13 device.
test("pour timing uses a decimal-capable keyboard on mobile", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "no dev user credentials");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  // let sign-in land before navigating: leaving early aborts the auth POST.
  await expect(page).toHaveURL(/coffees|brews/, { timeout: 15_000 });
  await page.goto("/brews/new").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  // Draft-only row: no server write until the form is submitted.
  await page.getByRole("button", { name: "Add pour" }).click();
  const time = page.getByLabel("Time m:ss");
  await expect(time).toBeVisible();
  // Decimal-capable keyboard, not the integer-only one and not type=number
  // (which cannot express m:ss and behaves inconsistently across browsers).
  await expect(time).toHaveAttribute("inputmode", "decimal");
  await expect.poll(() => time.evaluate((el) => (el as HTMLInputElement).type)).toBe("text");
  // A fractional entry is accepted by the field and parsed to whole seconds.
  await time.fill("0:35.5");
  await expect(time).toHaveValue("0:35.5");
  await expect(page.getByText("Pour 1").first()).toContainText("0:35");
});

test("tasting attributes offer a native select with custom entry on mobile", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "no dev user credentials");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  // let sign-in land before navigating: leaving early aborts the auth POST.
  await expect(page).toHaveURL(/coffees|brews/, { timeout: 15_000 });
  await page.goto("/brews/new").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  // Draft-only row: no server write until the form is submitted.
  await page.getByRole("button", { name: "+ Add attribute" }).first().click();
  const select = page.locator('select[aria-label="Hot attribute name"]');
  await expect(select).toBeVisible();
  // Touch target stays tappable at phone widths.
  const height = await select.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(44);
  // Fixed vocabulary from the centralized source, plus custom entry, and no
  // datalist fallback, which mobile browsers do not render as a dropdown.
  const values = await select.locator("option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
  for (const a of ["acidity", "sweetness", "body", "finish"]) {
    expect(values).toContain(a);
  }
  expect(values.at(-1)).toBe("__custom");
  await expect(page.locator("datalist#tasting-attributes")).toHaveCount(0);
  // Suggested pick writes the canonical lowercase name.
  await select.selectOption("acidity");
  await expect(select).toHaveValue("acidity");
  // Custom path swaps to a text input; the typed name is kept verbatim.
  await select.selectOption("__custom");
  const custom = page.getByLabel("Hot custom attribute name");
  await expect(custom).toBeVisible();
  await custom.fill("bergamot");
  await expect(custom).toHaveValue("bergamot");
});
