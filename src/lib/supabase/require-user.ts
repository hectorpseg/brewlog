import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth";

// ponytail: one cached getUser per server render. A layout and its page both
// calling requireUser share a single auth request instead of one each.
// Still getUser (server-validated), never getSession — same security as before.
export const getCachedUser = cache(async () => {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  return data.user;
});

export async function requireUser(next: string) {
  const user = await getCachedUser();
  if (!user) redirect(loginUrl(next));
  return user;
}
