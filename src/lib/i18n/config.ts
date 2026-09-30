// Locale config: the only place that enumerates supported languages. There are
// no locale route segments — the locale is resolved per request from a cookie
// (explicit user choice) or, absent that, the browser's Accept-Language header.

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "brewlog_locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

// Highest-priority language tag from an Accept-Language header (browsers order
// by preference; q-values win when present). Null when nothing is parseable.
function preferredTag(header: string): string | null {
  const parts = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag: (tag ?? "").trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((p) => p.tag !== "");
  if (parts.length === 0) return null;
  parts.sort((a, b) => b.weight - a.weight);
  return parts[0]?.tag ?? null;
}

// Only Spanish resolves to Spanish; every other language falls back to English.
export function acceptsSpanish(header: string | null): boolean {
  if (!header) return false;
  const tag = preferredTag(header);
  return tag === "es" || tag?.startsWith("es-") === true;
}

// Explicit cookie wins; otherwise detect from Accept-Language; otherwise English.
export function resolveLocale(cookieValue: string | null | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return acceptsSpanish(acceptLanguage) ? "es" : DEFAULT_LOCALE;
}
