"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

// ponytail: browser-safe anon client only, never service-role here
export function createClient() {
  const env = getEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
