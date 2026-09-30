// ponytail: lifecycle is computed, not stored — no workflow engine, no schema.
// A brew is "tasted" when any observation content exists; "brewed" when the
// core recipe is present; otherwise it is still in progress. Final beverage,
// tasting depth, and session never affect status — all optional by rule.

import type { TranslationKey } from "@/lib/i18n/dictionaries";

export type BrewLifecycle = "in-progress" | "brewed" | "tasted";

// English labels for unmigrated screens; migrated screens translate the keys.
export const BREW_LIFECYCLE_LABEL: Record<BrewLifecycle, string> = {
  "in-progress": "In progress",
  brewed: "Brewed",
  tasted: "Tasted",
};

export const BREW_LIFECYCLE_KEY: Record<BrewLifecycle, TranslationKey> = {
  "in-progress": "brew.status.inProgress",
  brewed: "brew.status.brewed",
  tasted: "brew.status.tasted",
};

type BrewLike = {
  temp_c?: unknown;
  grind_clicks?: unknown;
  total_time_sec?: unknown;
  session_id?: unknown;
};

type ObsLike = Record<string, unknown> | Record<string, unknown>[] | null | undefined;

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

export function hasTasting(obs: ObsLike): boolean {
  if (obs == null) return false;
  const o = Array.isArray(obs) ? (obs[0] ?? {}) : obs;
  return Object.values(o as Record<string, unknown>).some(hasValue);
}

export function brewLifecycle(brew: BrewLike, obs?: ObsLike): BrewLifecycle {
  if (hasTasting(obs)) return "tasted";
  if (hasValue(brew.temp_c) && hasValue(brew.grind_clicks)) return "brewed";
  return "in-progress";
}

export type BrewWarningKey = "brew.warning.noBrewTime" | "brew.warning.noSession";

// Contextual warnings, separate from lifecycle. "No session" is information,
// never a status — sessions are optional context.
export function brewWarningKeys(brew: BrewLike): BrewWarningKey[] {
  const keys: BrewWarningKey[] = [];
  if (!hasValue(brew.total_time_sec)) keys.push("brew.warning.noBrewTime");
  if (!hasValue(brew.session_id)) keys.push("brew.warning.noSession");
  return keys;
}

const WARNING_LABEL: Record<BrewWarningKey, string> = {
  "brew.warning.noBrewTime": "No brew time",
  "brew.warning.noSession": "No session",
};

// English convenience wrapper for unmigrated screens (migrated screens map
// brewWarningKeys through their translator).
export function brewWarnings(brew: BrewLike): string[] {
  return brewWarningKeys(brew).map((k) => WARNING_LABEL[k]);
}
