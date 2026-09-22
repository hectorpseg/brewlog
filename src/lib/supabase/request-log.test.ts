import { describe, expect, it } from "vitest";
import { describe as describeRequest } from "@/lib/supabase/request-log";

const URL = "https://xyz.supabase.co";

describe("describe", () => {
  it("classifies auth calls", () => {
    expect(describeRequest(`${URL}/auth/v1/user`, "GET", "server")).toMatchObject({
      kind: "auth",
      resource: "auth",
    });
  });

  it("distinguishes reads from mutations", () => {
    expect(describeRequest(`${URL}/rest/v1/brews?select=id`, "GET", "server").kind).toBe("read");
    expect(describeRequest(`${URL}/rest/v1/brews`, "PATCH", "server").kind).toBe("mutation");
  });

  it("exposes select columns so slim projections differ from full reloads", () => {
    const slim = describeRequest(
      `${URL}/rest/v1/brews?select=${encodeURIComponent("id,dose_g,water_g,brewed_at,created_at,coffees(name)")}`,
      "GET",
      "server",
    );
    expect(slim.resource).toContain("brews[");
    expect(slim.resource).toContain("id,dose_g");
    const full = describeRequest(
      `${URL}/rest/v1/brews?select=${encodeURIComponent("*,observations(*),sessions(title),coffees(name)")}`,
      "GET",
      "server",
    );
    expect(full.resource).toContain("observations(*)");
    expect(full.resource).not.toBe(slim.resource);
  });

  it("truncates very long select lists", () => {
    const long = "a,".repeat(200);
    const r = describeRequest(`${URL}/rest/v1/brews?select=${encodeURIComponent(long)}`, "GET", "server");
    expect(r.resource.length).toBeLessThan("brews[]".length + 101);
  });
});
