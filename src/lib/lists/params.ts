// ponytail: the URL is the list state. One tiny parser per list with
// validated fallbacks — unknown sort/filter values degrade to defaults,
// never a 500. Defaults are omitted when serializing so URLs stay short.

export const PAGE_SIZE = 20;
export const MAX_COUNT = 200;
export const MAX_QUERY = 120;

function str(v: unknown): string {
  return typeof v === "string" ? v : Array.isArray(v) ? String(v[0] ?? "") : "";
}

// UUID-guarded id params: garbage degrades to absent instead of erroring
// the query (PostgREST would 400 comparing uuid to junk text).
function cleanId(v: unknown): string {
  const s = str(v).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : "";
}

function cleanQuery(v: unknown): string {
  return str(v).trim().slice(0, MAX_QUERY);
}

function cleanCount(v: unknown): number {
  const raw = str(v);
  if (raw === "") return PAGE_SIZE;
  const n = Number(raw);
  if (!Number.isFinite(n)) return PAGE_SIZE;
  return Math.min(MAX_COUNT, Math.max(1, Math.floor(n)));
}

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  const s = str(v);
  return (options as readonly string[]).includes(s) ? (s as T) : fallback;
}

// LIKE wildcards in user input must match literally, never act as wildcards.
export function escapeLike(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type BrewsListParams = {
  q: string;
  sort: "newest" | "oldest" | "top";
  session: string; // "all" | "none" | session uuid
  coffee: string; // coffee uuid or ""
  fav: "all" | "only";
  count: number;
  tasted?: string; // "1" when tasted filter active
  untasted?: string; // "1" when untasted filter active
  hasScore?: string; // "1" when has-score filter active
  noScore?: string; // "1" when no-score filter active
};

export function parseBrewsParams(sp: Record<string, unknown>): BrewsListParams {
  const sessionRaw = str(sp.session);
  return {
    q: cleanQuery(sp.q),
    sort: oneOf(sp.sort, ["newest", "oldest", "top"] as const, "newest"),
    session: sessionRaw === "none" ? "none" : cleanId(sessionRaw) || "all",
    coffee: cleanId(sp.coffee),
    fav: oneOf(sp.fav, ["all", "only"] as const, "all"),
    count: cleanCount(sp.count),
    tasted: str(sp.tasted) === "1" ? "1" : undefined,
    untasted: str(sp.untasted) === "1" ? "1" : undefined,
    hasScore: str(sp["has-score"]) === "1" ? "1" : undefined,
    noScore: str(sp["no-score"]) === "1" ? "1" : undefined,
  };
}

export type CoffeeListParams = {
  q: string;
  sort: "recent" | "name";
  status: "available" | "depleted";
  count: number;
};

export function parseCoffeeParams(sp: Record<string, unknown>): CoffeeListParams {
  return {
    q: cleanQuery(sp.q),
    sort: oneOf(sp.sort, ["recent", "name"] as const, "recent"),
    status: oneOf(sp.status, ["available", "depleted"] as const, "available"),
    count: cleanCount(sp.count),
  };
}

export type SessionListParams = {
  q: string;
  sort: "recent" | "title";
  has: "all" | "brews" | "empty";
  count: number;
};

export function parseSessionParams(sp: Record<string, unknown>): SessionListParams {
  return {
    q: cleanQuery(sp.q),
    sort: oneOf(sp.sort, ["recent", "title"] as const, "recent"),
    has: oneOf(sp.has, ["all", "brews", "empty"] as const, "all"),
    count: cleanCount(sp.count),
  };
}

export type CuppingListParams = { q: string; sort: "newest" | "oldest"; count: number };

export function parseCuppingParams(sp: Record<string, unknown>): CuppingListParams {
  return {
    q: cleanQuery(sp.q),
    sort: oneOf(sp.sort, ["newest", "oldest"] as const, "newest"),
    count: cleanCount(sp.count),
  };
}

// Serialize back to a query string, omitting defaults. `resetCount` drops
// the count param (search/filter/sort changes restart at the first page).
export function toQuery(params: Record<string, string | number>, resetCount = false): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (resetCount && k === "count") continue;
    if (v === "" || v === "all") continue;
    if (k === "sort" && v === "newest") continue;
    if (k === "sort" && v === "recent") continue;
    if (k === "status" && v === "available") continue;
    if (k === "count" && Number(v) === PAGE_SIZE) continue;
    out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

export function listHref(base: string, params: Record<string, string | number>, resetCount = false): string {
  return `${base}${toQuery(params, resetCount)}`;
}
