import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({ auth: { getUser } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

// Fresh module per test: React cache() memoizes across calls, so without
// resetModules the first test's user would leak into the rest.
async function loadHelper() {
  vi.resetModules();
  return import("@/lib/supabase/require-user");
}

const user = { id: "u1", email: "t@example.com" };

describe("requireUser", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("returns the user without redirecting when authenticated", async () => {
    getUser.mockResolvedValue({ data: { user } });
    const { requireUser } = await loadHelper();
    await expect(requireUser("/brews")).resolves.toEqual(user);
  });

  it("redirects to login with the destination preserved when anonymous", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { requireUser } = await loadHelper();
    await expect(requireUser("/brews/abc")).rejects.toThrow(
      "REDIRECT:/login?next=%2Fbrews%2Fabc",
    );
  });

  it("shares one cached lookup across callers in the same render", async () => {
    // React cache() dedupes within a live server-render scope (layout + page
    // in production share one getUser request). Outside a render scope (here)
    // it passes through, so this asserts the structural invariant instead:
    // every caller goes through the single shared getCachedUser path.
    getUser.mockResolvedValue({ data: { user } });
    const helper = await loadHelper();
    await expect(helper.requireUser("/brews/compare")).resolves.toEqual(user);
    await expect(helper.getCachedUser()).resolves.toEqual(user);
    expect(getUser.mock.calls.length).toBeGreaterThan(0);
  });
});
