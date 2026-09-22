import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/require-user";

export default async function Home() {
  const user = await getCachedUser();
  // ponytail: home is recent brews, not inventory — the loop starts at the cup.
  redirect(user ? "/brews" : "/login");
}
