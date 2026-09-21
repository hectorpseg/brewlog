import { describe, expect, it } from "vitest";
import { shouldRestoreDraft } from "@/lib/drafts/local-store";

// Regression test for the observation-loss bug: a stale local draft must never
// clobber a fresher server row on page load. The server record is authoritative
// once synchronized; the draft wins only when strictly newer.
describe("shouldRestoreDraft", () => {
  const server = "2026-09-20T12:00:00.000Z";
  const serverMs = Date.parse(server);

  it("restores a draft that is newer than the server row", () => {
    expect(shouldRestoreDraft(serverMs + 60_000, server)).toBe(true);
  });

  it("rejects a draft that is older than the server row (the reported bug)", () => {
    expect(shouldRestoreDraft(serverMs - 60_000, server)).toBe(false);
  });

  it("rejects a draft with an equal timestamp (server wins ties)", () => {
    expect(shouldRestoreDraft(serverMs, server)).toBe(false);
  });

  it("restores when there is no server row yet (new record)", () => {
    expect(shouldRestoreDraft(Date.now(), null)).toBe(true);
    expect(shouldRestoreDraft(Date.now(), undefined)).toBe(true);
    expect(shouldRestoreDraft(Date.now(), "")).toBe(true);
  });

  it("resolves malformed timestamps in favor of the server", () => {
    expect(shouldRestoreDraft(Number.NaN, server)).toBe(false);
    expect(shouldRestoreDraft(Date.now(), "not-a-date")).toBe(false);
  });
});
