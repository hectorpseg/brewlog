import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  // ponytail: home is recent brews, not inventory — the loop starts at the cup.
  redirect(data.user ? "/brews" : "/login");
}
