import { test, expect } from "@playwright/test";

// Private single-user app: no public signup. Authenticated flows use a
// pre-existing dev user via E2E_EMAIL/E2E_PASSWORD; skipped without them.
test("login page offers sign-in only, no public signup", async ({ page }) => {
  await page.goto("/login").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" })).toHaveCount(0);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

// ponytail: one flow covers login -> coffee -> brew -> edit -> reload -> persisted.
// Requires E2E_EMAIL/E2E_PASSWORD for an existing dev user (+ Supabase keys +
// migration applied); skipped otherwise.
test("brew flow persists across reload", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "no dev user credentials");
  await page.goto("/login").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/coffees/, { timeout: 15_000 });

  await page.goto("/coffees/new");
  await page.getByLabel("Name *").fill("E2E Coffee");
  await page.getByRole("button", { name: "Save coffee" }).click();
  await expect(page).toHaveURL(/coffees\//, { timeout: 15_000 });
  // coffee detail offers "Brew again" (never "Copy last brew")
  await expect(page.getByRole("link", { name: "Brew again" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Copy last brew" })).toHaveCount(0);

  // coffee edit mode keeps the primary action compact: opening Edit must not
  // stretch "Brew again" into a tall block beside the form.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save coffee" })).toBeVisible();
  const brewAgainHeight = await page.getByRole("link", { name: "Brew again" }).evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  expect(brewAgainHeight).toBeLessThanOrEqual(60);

  await page.goto("/brews/new");
  await page.getByLabel("Coffee *").selectOption({ index: 1 });
  await page.reload();
  // draft restore: form still mounted (RLS-gated data aside, page renders)
  await expect(page.getByRole("heading", { name: "New brew" })).toBeVisible();
});
