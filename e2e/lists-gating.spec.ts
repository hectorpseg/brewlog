import { test, expect } from "@playwright/test";

// ponytail: no credentials, no writes, no production data touched. These
// pin the auth gate + URL-state contract: protected routes bounce to
// /login?next=<original URL intact> so server-side search/filter/sort/
// pagination state survives sign-in, and lists never render gated data.
test("protected routes preserve full URL state through the login bounce", async ({ page }) => {
  await page.goto("/brews?sort=top&q=tabi&session=none&fav=only&count=40").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL(/\/login\?next=/);
  const url = new URL(page.url());
  const next = new URL(url.searchParams.get("next") ?? "/", url.origin);
  expect(next.pathname).toBe("/brews");
  expect(next.searchParams.get("sort")).toBe("top");
  expect(next.searchParams.get("q")).toBe("tabi");
  expect(next.searchParams.get("session")).toBe("none");
  expect(next.searchParams.get("fav")).toBe("only");
  expect(next.searchParams.get("count")).toBe("40");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" })).toHaveCount(0);
});

test("new-brew and compare routes bounce to login without leaking forms", async ({ page }) => {
  for (const path of ["/brews/new", "/brews/compare?a=x&b=y", "/coffees/new", "/sessions/new"]) {
    await page.goto(path).catch(() => {});
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/login\?next=/, { timeout: 15_000 });
  }
  const url = new URL(page.url());
  expect(url.searchParams.get("next")).toBe("/sessions/new");
});

test("unknown routes render not-found, not a list", async ({ page }) => {
  await page.goto("/nope").catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText("Page not in the notebook")).toBeVisible();
});
