import { createBrowserClient } from "@supabase/ssr";

// ponytail: anon browser client (RLS enforced); recovery + password update run
// through Supabase Auth, never direct table writes, never service-role keys.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
