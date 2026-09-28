import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatRatio } from "@/lib/domain/ratio";

// ponytail: recently-viewed items are shaped here, purely, so the strip
// renders whatever the query resolved. Rows are untyped records; missing
// fields degrade to generic labels, never crash.

export const RECENT_ENTITY_TYPES = ["brew", "coffee", "session"] as const;
export type RecentEntityType = (typeof RECENT_ENTITY_TYPES)[number];

export const MAX_RECENT = 10;

export type RecentItem = {
  type: RecentEntityType;
  id: string;
  href: string;
  title: string;
  viewedAt: string;
};

export function recentHref(type: RecentEntityType, id: string): string {
  return type === "brew" ? `/brews/${id}` : type === "coffee" ? `/coffees/${id}` : `/sessions/${id}`;
}

function str(v: unknown): string {
  return typeof v === "string" && v !== "" ? v : "";
}

export function brewRecentItem(
  row: { id: unknown; dose_g: unknown; water_g: unknown; brewed_at: unknown; created_at: unknown; coffee_name: unknown },
  viewedAt: string,
): RecentItem | null {
  if (typeof row.id !== "string" || row.id === "") return null;
  const dose = typeof row.dose_g === "number" || typeof row.dose_g === "string" ? Number(row.dose_g) : NaN;
  const water = typeof row.water_g === "number" || typeof row.water_g === "string" ? Number(row.water_g) : NaN;
  const ratio = Number.isFinite(dose) && Number.isFinite(water) ? formatRatio(dose, water) : null;
  const coffee = str(row.coffee_name);
  const rawDay = typeof row.brewed_at === "string" && row.brewed_at !== ""
    ? row.brewed_at
    : typeof row.created_at === "string" && row.created_at !== ""
      ? row.created_at
      : null;
  const dated = rawDay ? formatBrewDate(rawDay) : "";
  const day = dated === "-" ? "" : dated;
  const title = [ratio ?? "Brew", coffee || day].filter(Boolean).join(" · ");
  return { type: "brew", id: row.id, href: recentHref("brew", row.id), title, viewedAt };
}

export function coffeeRecentItem(
  row: { id: unknown; name: unknown; remaining_weight_g: unknown },
  viewedAt: string,
): RecentItem | null {
  if (typeof row.id !== "string" || row.id === "") return null;
  const name = str(row.name) || "Coffee";
  const remaining = typeof row.remaining_weight_g === "number" || typeof row.remaining_weight_g === "string"
    ? Number(row.remaining_weight_g)
    : NaN;
  const title = Number.isFinite(remaining) ? `${name} · ~${remaining} g` : name;
  return { type: "coffee", id: row.id, href: recentHref("coffee", row.id), title, viewedAt };
}

export function sessionRecentItem(row: { id: unknown; title: unknown }, viewedAt: string): RecentItem | null {
  if (typeof row.id !== "string" || row.id === "") return null;
  const title = str(row.title) || "Session";
  return { type: "session", id: row.id, href: recentHref("session", row.id), title, viewedAt };
}
