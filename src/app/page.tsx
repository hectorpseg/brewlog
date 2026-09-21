import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  redirect(data.user ? "/coffees" : "/login");
}
