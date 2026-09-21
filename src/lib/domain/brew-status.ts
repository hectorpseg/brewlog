// ponytail: lifecycle is computed, not stored — no workflow engine, no schema.
// A brew is "tasted" when any observation content exists; "brewed" when the
// core recipe is present; otherwise it is still in progress. Final beverage,
// tasting depth, and session never affect status — all optional by rule.

export type BrewLifecycle = "in-progress" | "brewed" | "tasted";

export const BREW_LIFECYCLE_LABEL: Record<BrewLifecycle, string> = {
  "in-progress": "In progress",
  brewed: "Brewed",
  tasted: "Tasted",
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

// Contextual warnings, separate from lifecycle. "No session" is information,
// never a status — sessions are optional context.
export function brewWarnings(brew: BrewLike): string[] {
  const warnings: string[] = [];
  if (!hasValue(brew.total_time_sec)) warnings.push("No brew time");
  if (!hasValue(brew.session_id)) warnings.push("No session");
  return warnings;
}
