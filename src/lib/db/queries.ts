import "server-only";
import { createClient } from "@/lib/supabase/server";

// ponytail: one helper per entity, RLS does authz, never accept client user_id
export async function listCoffees() {
  const db = await createClient();
  const { data, error } = await db.from("coffees").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getCoffee(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("coffees").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listBrews(coffeeId?: string) {
  const db = await createClient();
  let q = db.from("brews").select("*, observations(*)").order("created_at", { ascending: false }).limit(50);
  if (coffeeId) q = q.eq("coffee_id", coffeeId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function getBrew(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("brews").select("*, observations(*), coffees(*)").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function latestBrewForCoffee(coffeeId: string) {
  const db = await createClient();
  const { data } = await db.from("brews").select("*").eq("coffee_id", coffeeId).order("created_at", { ascending: false }).limit(1).single();
  return data ?? null;
}
