// ponytail: list prefs are per-device UI memory, not data. One localStorage
// key for every list (spec: `brewlog:prefs`), each list owning its scope —
// never a global saved-filter system. Sort/filter only; search text and page
// size stay session state. Storage is injected so this stays pure + testable.

export const PREFS_KEY = "brewlog:prefs";

export type ListName = "brews" | "coffees" | "sessions" | "cuppings";
export type ListPrefs = { sort?: string; session?: string; has?: string };
export type PrefsDoc = Partial<Record<ListName, ListPrefs>>;

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
