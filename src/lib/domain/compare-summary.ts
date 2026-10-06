import { formatBrewDate } from "@/lib/domain/brew-date";
import type { CompareRow } from "@/lib/domain/brew-diff";

// Text form of a comparison for paste/chat and native share. Facts only:
// one block per brew from the recorded scalars (unrecorded fields are
// skipped, never guessed), then the fields that actually differ joined in
// slot order so "what changed" holds up beyond two brews.
const BREW_HEADER_FIELDS = [
  "Ratio", "Dose", "Starting temperature", "Grind", "Brew time", "Final beverage",
] as const;

function recorded(v: string | undefined): boolean {
  return v !== undefined && v !== "-";
}

export function formatCompareSummary(
  scalars: Record<string, string>[],
  dates: string[],
  changedRows: CompareRow[],
): string {
  const out: string[] = [`Brew comparison (${scalars.length})`];
  scalars.forEach((s, i) => {
    const head = [s.Coffee, dates[i]].filter(recorded).join(" · ");
    const details = BREW_HEADER_FIELDS.map((k) => s[k]).filter(recorded);
    out.push(...(head ? [`${i + 1}) ${head}`] : []));
    if (details.length > 0) out.push(`   ${details.join(" · ")}`);
  });
  const changes = changedRows.map((r) => `- ${r.label}: ${r.values.join(" → ")}`);
  if (changes.length > 0) out.push("", "Changed:", ...changes);
  return out.join("\n");
}

// Headers for the same brews: coffee · date (mirror of the per-brew block).
export function compareBrewDates(brews: { brewed_at: string | null; created_at: string }[]): string[] {
  return brews.map((b) => formatBrewDate(b.brewed_at ?? b.created_at));
}
