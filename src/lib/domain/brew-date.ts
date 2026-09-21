// ponytail: brewed_at is a user-facing calendar date; created_at stays the
// audit timestamp. Date-only input ("2026-09-21") is pinned to noon UTC so the
// calendar day survives every timezone.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isBrewDate(s: unknown): s is string {
  return typeof s === "string" && DATE_RE.test(s);
}

// "2026-09-21" → ISO instant, or undefined when absent/invalid (caller falls back to now()).
export function toBrewedAtIso(dateStr?: string | null): string | undefined {
  if (!isBrewDate(dateStr)) return undefined;
  return `${dateStr}T12:00:00.000Z`;
}

// Today's date in the user's locale, for <input type="date"> defaults.
export function defaultBrewedDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Stored instant → "Sep 21". Time-of-day is never shown: this is a day field.
export function formatBrewDate(iso?: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Received dates may be ISO ("2026-09-08") or free text. Pretty-print ISO,
// pass anything else through untouched — unknown stays unknown.
export function formatReceived(v?: string | null): string {
  if (v == null || v === "") return "unknown";
  if (DATE_RE.test(v)) return formatBrewDate(`${v}T12:00:00.000Z`);
  return v;
}

// Stored instant → "2026-09-21" for <input type="date"> values.
export function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
