// ponytail: experiments stay plain rows + one junction table. Status is
// explicit user-entered state (never inferred); the legacy open/answered
// predicate below only describes old rows for read-only surfaces.
export type ExperimentLike = {
  conclusion?: string | null;
  actualResult?: string | null;
  actual_result?: string | null;
};

export function experimentStatus(exp: ExperimentLike): "open" | "answered" {
  const done = exp.conclusion ?? exp.actualResult ?? exp.actual_result;
  return done != null && String(done).trim() !== "" ? "answered" : "open";
}

export const EXPERIMENT_STATUSES = ["planned", "in_progress", "evaluated"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const EXPERIMENT_STATUS_LABEL: Record<ExperimentStatus, string> = {
  planned: "planned",
  in_progress: "in progress",
  evaluated: "evaluated",
};

export function isExperimentStatus(v: unknown): v is ExperimentStatus {
  return typeof v === "string" && (EXPERIMENT_STATUSES as readonly string[]).includes(v);
}

// Display title: explicit title first, then hypothesis excerpt (legacy rows
// have no title), never invented beyond that.
export function experimentTitle(exp: { title?: string | null; hypothesis?: string | null }): string {
  const t = typeof exp.title === "string" ? exp.title.trim() : "";
  if (t !== "") return t.slice(0, 120);
  const h = typeof exp.hypothesis === "string" ? exp.hypothesis.trim() : "";
  if (h !== "") return h.slice(0, 80);
  return "Untitled experiment";
}

// ponytail: variables reuse the existing changed_variables column (same
// meaning, new label), so no duplicate column and no dual-write.
function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export type ExperimentSummaryBrew = {
  dose_g?: unknown;
  water_g?: unknown;
  brewed_at?: unknown;
  created_at?: unknown;
  coffees?: { name?: unknown } | { name?: unknown }[] | null;
};

export type ExperimentSummaryInput = {
  title?: unknown;
  status?: unknown;
  hypothesis?: unknown;
  changed_variables?: unknown;
  variables?: unknown;
  notes?: unknown;
  conclusion?: unknown;
  brews?: ExperimentSummaryBrew[] | null;
};

// Deterministic plain-text summary: stored data only, no inference, no LLM.
// Empty conclusion is omitted. Brews render as compact count + one line each.
export function formatExperimentSummary(input: ExperimentSummaryInput): string {
  const lines: string[] = [];
  const title = text(input.title) ?? text(input.hypothesis) ?? "Untitled experiment";
  lines.push(`Experiment\nTitle: ${title}`);
  const status = text(input.status);
  if (status) lines.push(`Status: ${status}`);
  const hypothesis = text(input.hypothesis);
  if (hypothesis) lines.push(`Hypothesis: ${hypothesis}`);
  const variables = text(input.variables) ?? text(input.changed_variables);
  if (variables) lines.push(`Variables: ${variables}`);
  const brews = Array.isArray(input.brews) ? input.brews : [];
  if (brews.length > 0) {
    lines.push(`Brews: ${brews.length}`);
    for (const b of brews) {
      const dose = Number(b.dose_g);
      const water = Number(b.water_g);
      const recipe =
        Number.isFinite(dose) && Number.isFinite(water) ? `${dose} g / ${water} g` : "Brew";
      const rawCoffee = Array.isArray(b.coffees) ? b.coffees[0]?.name : b.coffees?.name;
      const coffee = text(rawCoffee);
      lines.push(`- ${coffee ? `${coffee} · ` : ""}${recipe}`);
    }
  } else {
    lines.push("Brews: 0");
  }
  const notes = text(input.notes);
  if (notes) lines.push(`Notes: ${notes}`);
  const conclusion = text(input.conclusion);
  if (conclusion) lines.push(`Conclusion: ${conclusion}`);
  return lines.join("\n");
}

// Junction brew ids first, legacy single brew_id appended when missing.
// Pure so the detail-page merge is pinned by tests: the query helper below
// must use this instead of reimplementing the merge inline.
export function mergeBrewIdSet(linked: string[], legacy: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...linked, ...(legacy ? [legacy] : [])]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

// The experiment detail lookup, exactly as sent to PostgREST. Pinned by
// tests: the bare `brews` embed is ambiguous since 0009 (legacy FK plus the
// many-to-many path through experiment_brews → PGRST201), so the hint is
// load-bearing for every legacy row with brew_id and no junction row.
export const EXPERIMENT_DETAIL_SELECT =
  "*, brews!experiments_brew_id_fkey(id, dose_g, water_g, coffee_id, coffees(name))";

// Merge junction-linked brews with the legacy single brew_id link, deduped
// by id. Legacy rows predate the junction table and must keep showing up.
export function mergeExperimentBrews<T extends { id: string }>(
  linked: T[],
  legacy: T | T[] | null | undefined,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const b of linked ?? []) {
    if (b && !seen.has(b.id)) {
      seen.add(b.id);
      out.push(b);
    }
  }
  const rest = Array.isArray(legacy) ? legacy : legacy ? [legacy] : [];
  for (const b of rest) {
    if (b && !seen.has(b.id)) {
      seen.add(b.id);
      out.push(b);
    }
  }
  return out;
}
