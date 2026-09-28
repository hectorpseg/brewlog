import { describe, expect, it } from "vitest";
import { BREWS_LIST_PREF_KEYS, MAX_PRESETS, PREFS_KEY, deletePreset, mergeStoredPrefs, readListPrefs, readPrefs, readSavedPresets, savePreset, writeListPrefs } from "@/lib/lists/prefs";

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

describe("mergeStoredPrefs", () => {
  const keys = BREWS_LIST_PREF_KEYS;
  it("restores stored keys the URL omits and never overrides explicit ones", () => {
    const stored = { q: "tabi", sort: "top", fav: "only", "has-score": "1" };
    const { merged, changed } = mergeStoredPrefs({ sort: "top", count: 40 }, { sort: "top" }, stored, keys);
    expect(changed).toBe(true);
    expect(merged).toEqual({ q: "tabi", sort: "top", fav: "only", "has-score": "1", count: 40 });
  });
  it("treats explicit empty values as cleared, not missing", () => {
    const { merged, changed } = mergeStoredPrefs({ q: "" }, { q: "" }, { q: "tabi", sort: "top" }, keys);
    expect(changed).toBe(true);
    expect(merged.q).toBe("");
    expect(merged.sort).toBe("top");
  });
  it("never restores pagination and reports no change when already applied", () => {
    const { merged, changed } = mergeStoredPrefs({ q: "x", count: 20 }, { q: "x" }, { q: "x" }, keys);
    expect(changed).toBe(false);
    expect(merged).toEqual({ q: "x", count: 20 });
    expect(keys).not.toContain("count");
  });
});

describe("saved presets", () => {
  it("starts empty and round-trips", () => {
    const s = memStore();
    expect(readSavedPresets(s, "brews")).toEqual([]);
    savePreset(s, "brews", "Top unassigned", { sort: "top", session: "none" });
    expect(readSavedPresets(s, "brews")).toEqual([{ name: "Top unassigned", prefs: { sort: "top", session: "none" } }]);
    expect(readSavedPresets(s, "sessions")).toEqual([]);
  });
  it("replaces same-name presets and deletes by name", () => {
    const s = memStore();
    savePreset(s, "brews", "Fav", { fav: "only" });
    savePreset(s, "brews", "Fav", { fav: "only", sort: "top" });
    expect(readSavedPresets(s, "brews")).toEqual([{ name: "Fav", prefs: { fav: "only", sort: "top" } }]);
    expect(deletePreset(s, "brews", "Fav")).toEqual([]);
  });
  it("rejects blank names and caps the list", () => {
    const s = memStore();
    savePreset(s, "brews", "   ", { sort: "top" });
    expect(readSavedPresets(s, "brews")).toEqual([]);
    for (let i = 0; i < MAX_PRESETS + 3; i++) savePreset(s, "brews", `p${i}`, { sort: "top" });
    const names = readSavedPresets(s, "brews").map((p) => p.name);
    expect(names).toHaveLength(MAX_PRESETS);
    expect(names).not.toContain("p0");
    expect(names).toContain(`p${MAX_PRESETS + 2}`);
  });
  it("ignores garbage shapes", () => {
    const s = memStore({ [PREFS_KEY]: JSON.stringify({ saved: { brews: [{ nope: 1 }, null, "x"] } }) });
    expect(readSavedPresets(s, "brews")).toEqual([]);
  });
});
