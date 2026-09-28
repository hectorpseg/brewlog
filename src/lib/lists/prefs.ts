// ponytail: list prefs are per-device UI memory, not data. One localStorage
// key for every list (spec: `brewlog:prefs`), each list owning its scope —
// never a global saved-filter system. Sort/filter only; search text and page
// size stay session state. Storage is injected so this stays pure + testable.

export const PREFS_KEY = "brewlog:prefs";

export type ListName = "brews" | "coffees" | "sessions" | "cuppings";
export type ListPrefs = { sort?: string; session?: string; has?: string; fav?: string };
export type PrefsDoc = Partial<Record<ListName, ListPrefs>> & {
  saved?: Partial<Record<ListName, SavedPreset[]>>;
};

type Reader = Pick<Storage, "getItem">;
type Writer = Pick<Storage, "getItem" | "setItem">;

function safeParse(raw: string | null): PrefsDoc {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
    return v as PrefsDoc;
  } catch {
    return {};
  }
}

export function readPrefs(storage: Reader | undefined | null): PrefsDoc {
  if (!storage) return {};
  try {
    return safeParse(storage.getItem(PREFS_KEY));
  } catch {
    return {};
  }
}

export function readListPrefs(storage: Reader | undefined | null, list: ListName): ListPrefs {
  const doc = readPrefs(storage);
  const p = doc[list];
  return typeof p === "object" && p !== null ? p : {};
}

// Merge-write: touching one list never drops another list's prefs.
export function writeListPrefs(storage: Writer | undefined | null, list: ListName, prefs: ListPrefs): void {
  if (!storage) return;
  try {
    const doc = readPrefs(storage);
    storage.setItem(PREFS_KEY, JSON.stringify({ ...doc, [list]: prefs }));
  } catch {
    // private-mode quota etc: prefs are a nicety, never load-bearing
  }
}

// --- Saved filter combinations ------------------------------------------------
// ponytail: named presets are local UI memory in the same doc, scoped per
// list — never a table, never global. A preset captures sort/filter only
// (never search text or page size); applying it rebuilds the URL and the
// backend still executes the query.

export type SavedPreset = { name: string; prefs: ListPrefs };
export const MAX_PRESETS = 10;
export const MAX_PRESET_NAME = 40;

function cleanPreset(v: unknown): SavedPreset | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.name !== "string" || typeof r.prefs !== "object" || r.prefs === null) return null;
  const name = r.name.trim().slice(0, MAX_PRESET_NAME);
  if (name === "") return null;
  return { name, prefs: r.prefs as ListPrefs };
}

export function readSavedPresets(storage: Reader | undefined | null, list: ListName): SavedPreset[] {
  const doc = readPrefs(storage);
  const saved = doc.saved?.[list];
  if (!Array.isArray(saved)) return [];
  const out: SavedPreset[] = [];
  for (const p of saved) {
    const clean = cleanPreset(p);
    if (clean) out.push(clean);
  }
  return out;
}

function writeSavedPresets(storage: Writer | undefined | null, list: ListName, presets: SavedPreset[]): SavedPreset[] {
  if (!storage) return presets;
  try {
    const doc = readPrefs(storage);
    storage.setItem(PREFS_KEY, JSON.stringify({ ...doc, saved: { ...doc.saved, [list]: presets } }));
  } catch {
    // nicety only
  }
  return presets;
}

// Save (replaces same-name): oldest drops off past the cap, newest last.
export function savePreset(storage: Writer | undefined | null, list: ListName, name: string, prefs: ListPrefs): SavedPreset[] {
  const clean = cleanPreset({ name, prefs });
  if (!clean || !storage) return readSavedPresets(storage, list);
  const kept = readSavedPresets(storage, list).filter((p) => p.name !== clean.name);
  while (kept.length >= MAX_PRESETS) kept.shift();
  kept.push(clean);
  return writeSavedPresets(storage, list, kept);
}

export function deletePreset(storage: Writer | undefined | null, list: ListName, name: string): SavedPreset[] {
  if (!storage) return [];
  const kept = readSavedPresets(storage, list).filter((p) => p.name !== name);
  return writeSavedPresets(storage, list, kept);
}

// --- Brew list density --------------------------------------------------------
// ponytail: one value, not a settings system. Same philosophy as list prefs
// (per-device localStorage, fails safe, scoped to the brew list) but a
// separate key on purpose: density is view memory, never part of saved filter
// presets and never a URL query param — search/filter/sort URLs stay short
// and shareable regardless of how the viewer likes to scan.

export const DENSITY_KEY = "brewlog:brews-density";
export type BrewDensity = "comfortable" | "compact";

export function readBrewDensity(storage: Reader | undefined | null): BrewDensity {
  if (!storage) return "comfortable";
  try {
    return storage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

export function writeBrewDensity(storage: Writer | undefined | null, density: BrewDensity): void {
  if (!storage) return;
  try {
    storage.setItem(DENSITY_KEY, density);
  } catch {
    // nicety only
  }
}
