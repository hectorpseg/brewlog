import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCoffees, latestBrewForCoffee } from "@/lib/db/queries";
import { BrewForm } from "@/components/brew-form";

export default async function NewBrewPage({ searchParams }: { searchParams: Promise<{ coffee?: string; copy?: string }> }) {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const sp = await searchParams;
  const coffees = await listCoffees().catch(() => []);
  const copyFrom = sp.copy === "1" && sp.coffee ? await latestBrewForCoffee(sp.coffee).catch(() => null) : null;
  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold">New brew</h1>
      <BrewForm
        userId={data.user.id}
        coffees={coffees.map((c: { id: string; name: string; remaining_weight_g: number | null }) => c)}
        initialCoffeeId={sp.coffee}
        copyFrom={copyFrom}
      />
    </div>
  );
}
