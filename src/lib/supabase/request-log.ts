// Dev-only Supabase request instrumentation. Counts + logs every fetch aimed
// at the Supabase project so request storms are visible during smoke tests.
// Each entry records operation, table/resource, read-vs-mutation, and the app
// route that issued it — enough to answer "how many requests did this
// interaction generate, and what were they". Never active in production:
// patchFetch() no-ops there (see instrumentation.ts + layout).

type Scope = "server" | "client";

export type RequestEntry = {
  n: number;
  scope: Scope;
  method: string;
  kind: "read" | "mutation" | "auth" | "other";
  operation: string;
  resource: string;
  route: string;
};

const entries: RequestEntry[] = [];
const counts: Record<Scope, number> = { server: 0, client: 0 };
const patched: Record<Scope, boolean> = { server: false, client: false };

function isSupabaseUrl(url: string): boolean {
  return url.includes(".supabase.co");
}

// POSTGREST: GET/HEAD = read; POST/PUT/PATCH/DELETE = mutation. supabase-js
// sends upserts as POST with Prefer: resolution=merge-duplicates — still a mutation.
// The select columns ride along (truncated) so a slim projection is
// distinguishable from a full-row reload in the dev console.
export function describe(url: string, method: string, route: string): Omit<RequestEntry, "n" | "scope"> {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  if (path.startsWith("/auth/v1/")) {
    return { method, kind: "auth", operation: method, resource: "auth", route };
  }
  const rest = path.match(/^\/rest\/v1\/([^/?]+)/);
  if (rest) {
    const kind = method === "GET" || method === "HEAD" ? "read" : "mutation";
    let resource = rest[1];
    if (kind === "read") {
      const select = new URL(url).searchParams.get("select") ?? "";
      if (select) resource += `[${select.slice(0, 100)}]`;
    }
    return { method, kind, operation: method, resource, route };
  }
  if (path.startsWith("/storage/v1/")) {
    const kind = method === "GET" || method === "HEAD" ? "read" : "mutation";
    return { method, kind, operation: method, resource: "storage", route };
  }
  if (path.startsWith("/realtime/v1/")) {
    return { method, kind: "other", operation: method, resource: "realtime", route };
  }
  return { method, kind: "other", operation: method, resource: path.split("?")[0], route };
}

export function patchFetch(scope: Scope): void {
  if (process.env.NODE_ENV === "production" || patched[scope]) return;
  patched[scope] = true;
  const target = (scope === "server" ? globalThis : window) as typeof globalThis & Window;
  const orig = target.fetch.bind(target);
  target.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (isSupabaseUrl(url)) {
      counts[scope] += 1;
      const route =
        scope === "client" && typeof window !== "undefined" && window.location
          ? window.location.pathname
          : "server";
      const entry: RequestEntry = { n: counts[scope], scope, ...describe(url, init?.method ?? "GET", route) };
      entries.push(entry);
      if (entries.length > 200) entries.shift();
      console.debug(`[supabase:${scope}] #${entry.n} ${entry.operation} ${entry.kind} ${entry.resource} · ${entry.route}`);
    }
    return orig(input as RequestInfo, init);
  }) as typeof fetch;
}

export function getRequestCounts(): Record<Scope, number> {
  return { ...counts };
}

export function getRequestLog(): RequestEntry[] {
  return [...entries];
}

export function resetRequestCounts(): void {
  counts.server = 0;
  counts.client = 0;
  entries.length = 0;
}
