import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig, updateInitialEnv } from "@next/env";

// Shared CLI plumbing for brewlog:backup / brewlog:export. `.env.local` is
// the canonical local configuration: loadCliEnv() populates process.env
// with the exact loader the Next.js runtime uses (same file cascade,
// expansion, and precedence), so CLI scripts and the app never disagree.
// Real environment variables always win over file values and are never
// overridden. Call it once before resolveConfig; values below are only ever
// read, never logged or written into backups/exports.

export function loadCliEnv(dir: string = process.cwd()): void {
  // Refresh the snapshot first: "real environment wins" must mean the
  // environment as it is at load time, not at the first load ever.
  // forceReload: @next/env caches the first load per process and no-ops
  // after it. The CLI calls this once, but repeated calls (tests, future
  // multi-dir use) must actually load — last call wins.
  updateInitialEnv(process.env as Record<string, string | undefined>);
  loadEnvConfig(dir, true, undefined, true);
}

export type CliConfig = {
  url: string;
  anonKey: string;
  email: string;
  password: string;
};

export function resolveConfig(env: Record<string, string | undefined>): CliConfig {
  const pick = (k: string) => env[k] ?? "";
  const url = pick("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || pick("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const email = pick("BREWLOG_EMAIL");
  const password = pick("BREWLOG_PASSWORD");
  const missing = [
    url ? null : "NEXT_PUBLIC_SUPABASE_URL (.env.local)",
    anonKey ? null : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local)",
    email ? null : "BREWLOG_EMAIL (.env.local)",
    password ? null : "BREWLOG_PASSWORD (.env.local)",
  ].filter((v): v is string => v !== null);
  if (missing.length > 0) {
    throw new Error(
      `missing configuration: ${missing.join(", ")}. ` +
        `Set BREWLOG_EMAIL/BREWLOG_PASSWORD in the environment; Supabase keys come from .env.local.`,
    );
  }
  return { url, anonKey, email, password };
}

export async function signInUser(config: CliConfig) {
  const supabase = createClient(config.url, config.anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });
  if (error || !data.user) throw new Error(`sign-in failed: ${error?.message ?? "unknown error"}`);
  return { supabase, userId: data.user.id };
}
