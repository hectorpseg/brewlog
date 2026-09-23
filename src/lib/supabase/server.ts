import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ponytail: anon server client (RLS enforced); service-role only in scripts, never imported here
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from Server Component (read-only); middleware refreshes instead
          }
        },
      },
    },
  );
}
