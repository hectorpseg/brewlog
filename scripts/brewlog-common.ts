import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Shared CLI plumbing for brewlog:backup / brewlog:export. Reads config from
// .env.local (preferred) then .env; credentials come from the environment
// only (BREWLOG_EMAIL / BREWLOG_PASSWORD) and are never written anywhere.

export function loadEnvFiles(): Record<string, string> {
  const merged: Record<string, string> = {};
  // .env first, .env.local second so local values win
  for (const file of [".env", ".env.local"]) {
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      merged[m[1]] = v;
    }
  }
  return merged;
}

export type CliConfig = {
  url: string;
  anonKey: string;
  email: string;
  password: string;
};

export function resolveConfig(env: NodeJS.ProcessEnv, files: Record<string, string>): CliConfig {
  const pick = (k: string) => env[k] ?? files[k] ?? "";
  const url = pick("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || pick("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const email = env.BREWLOG_EMAIL ?? "";
  const password = env.BREWLOG_PASSWORD ?? "";
  const missing = [
    url ? null : "NEXT_PUBLIC_SUPABASE_URL (.env.local)",
    anonKey ? null : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local)",
    email ? null : "BREWLOG_EMAIL (environment)",
    password ? null : "BREWLOG_PASSWORD (environment)",
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
