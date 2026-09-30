// ponytail: session candidate helpers are pure — the page fetches slim rows,
// everything else (exclude members, label) is computed locally, never refetched.

import { DICTIONARIES, type TranslationKey } from "@/lib/i18n/dictionaries";

export type CandidateRow = {
  id: string;
  dose_g: number;
  water_g: number;
  temp_c: number | null;
  grind_clicks: number | null;
  session_id: string | null;
};

export function excludeSessionBrews<T extends { session_id: string | null }>(
  all: T[],
  sessionId: string,
): T[] {
  return all.filter((b) => b.session_id !== sessionId);
}

// Optional translate localizes the "clicks" unit label; the English default
// matches the pinned format exactly.
export function formatCandidateLabel(
  b: {
    dose_g: number;
    water_g: number;
    temp_c: number | null;
    grind_clicks: number | null;
  },
  translate: (k: TranslationKey) => string = (k) => DICTIONARIES.en[k],
): string {
  return `${b.dose_g}g / ${b.water_g}g · ${b.temp_c ?? "?"}°C · ${b.grind_clicks ?? "?"} ${translate("brew.clicks")}`;
}
