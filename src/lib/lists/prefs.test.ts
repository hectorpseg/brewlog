import { describe, expect, it } from "vitest";
import { PREFS_KEY, readListPrefs, readPrefs, writeListPrefs } from "@/lib/lists/prefs";

function memStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    peek: () => ({ ...data }),
  };
}

describe("list prefs", () => {
  it("reads empty without storage", () => {
    expect(readPrefs(undefined)).toEqual({});
    expect(readListPrefs(null, "brews")).toEqual({});
  });
  it("survives garbage and wrong shapes", () => {
    expect(readPrefs(memStore({ [PREFS_KEY]: "not json" }))).toEqual({});
    expect(readPrefs(memStore({ [PREFS_KEY]: "[1,2]" }))).toEqual({});
    expect(readListPrefs(memStore({ [PREFS_KEY]: "{}" }), "brews")).toEqual({});
  });
  it("merge-writes per list without dropping siblings", () => {
    const s = memStore();
    writeListPrefs(s, "brews", { sort: "oldest", session: "none" });
    writeListPrefs(s, "coffees", { sort: "name" });
    expect(readListPrefs(s, "brews")).toEqual({ sort: "oldest", session: "none" });
    expect(readListPrefs(s, "coffees")).toEqual({ sort: "name" });
    expect(readListPrefs(s, "sessions")).toEqual({});
  });
  it("never throws on hostile storage", () => {
    const bad = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(readPrefs(bad)).toEqual({});
    expect(() => writeListPrefs(bad, "brews", { sort: "oldest" })).not.toThrow();
  });
});
