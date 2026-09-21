// ponytail: shallow key diff is enough for "what changed?"
export type BrewLike = Record<string, unknown>;

const IGNORED = new Set(["id", "user_id", "created_at", "updated_at"]);

export function diffBrews(a: BrewLike, b: BrewLike): { changed: string[]; same: string[] } {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed: string[] = [];
  const same: string[] = [];
  for (const k of keys) {
    if (IGNORED.has(k)) continue;
    if (a[k] === b[k]) same.push(k);
    else changed.push(k);
  }
  return { changed: changed.sort(), same: same.sort() };
}
