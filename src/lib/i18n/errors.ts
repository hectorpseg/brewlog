// ponytail: stable, language-neutral error codes travel through schemas,
// server actions, and redirects; translation happens only at render. Raw
// Supabase/PostgREST messages never reach the client: unknown codes resolve
// to one generic localized message.

import type { TranslationKey } from "@/lib/i18n/dictionaries";

// Application-owned failure concepts. Codes are ASCII, stable, and never
// user-entered — safe in URLs and FormData round trips.
export const ERROR_CODES = [
  // validation (Zod-owned, rendered under form fields)
  "name.required",
  "date.future",
  "coffee.pick",
  "cupping.date.future",
  // server action failures
  "brew.invalid",
  "brew.notesFailed",
  "brew.tastingFailed",
  "brew.poursFailed",
  "observation.invalid",
  "tasting.invalid",
  "pour.invalid",
  "coffee.invalid",
  // database / third-party
  "auth.invalidCredentials",
  "save.failed",
  "delete.failed",
  // one generic fallback for anything unknown
  "generic",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

// The render-time vocabulary. One row per code; the map itself is the contract.
export const ERROR_KEYS: Record<ErrorCode, TranslationKey> = {
  "name.required": "err.name.required",
  "date.future": "err.date.future",
  "coffee.pick": "err.coffee.pick",
  "cupping.date.future": "err.cupping.date.future",
  "brew.invalid": "err.brew.invalid",
  "brew.notesFailed": "err.brew.notesFailed",
  "brew.tastingFailed": "err.brew.tastingFailed",
  "brew.poursFailed": "err.brew.poursFailed",
  "observation.invalid": "err.observation.invalid",
  "tasting.invalid": "err.tasting.invalid",
  "pour.invalid": "err.pour.invalid",
  "coffee.invalid": "err.coffee.invalid",
  "auth.invalidCredentials": "err.auth.invalidCredentials",
  "save.failed": "err.save.failed",
  "delete.failed": "err.delete.failed",
  "generic": "err.generic",
};

// Zod message fields accept any string; msg() stamps the stable code so the
// schema stays language-neutral and resolvers carry codes to the UI.
export function msg(code: ErrorCode): string {
  return code;
}

export function isErrorCode(v: unknown): v is ErrorCode {
  return typeof v === "string" && (ERROR_CODES as readonly string[]).includes(v);
}

// Render helper: unknown/legacy values (old URLs may still carry raw message
// text) degrade to the generic localized error, never a blank or raw string.
export function errorText(code: string | null | undefined, t: (k: TranslationKey) => string): string {
  return t(ERROR_KEYS[isErrorCode(code) ? code : "generic"]);
}
