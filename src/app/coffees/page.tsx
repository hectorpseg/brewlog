import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCoffees } from "@/lib/db/queries";
import { logout, resetDevData, seedDevData } from "@/app/actions";
import { Button, Card } from "@/components/ui/controls";

export default async function CoffeesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const sp = await searchParams;
  const coffees = await listCoffees().catch(() => null);
  const devSeed = process.env.ALLOW_DEV_SEED === "true";
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coffees</h1>
        <div className="flex gap-2">
          <Link href="/coffees/new" className="min-h-11 rounded-xl bg-zinc-900 px-4 py-2 text-white">+ Coffee</Link>
          <form action={logout}><Button variant="ghost">Out</Button></form>
        </div>
      </div>
      {sp.error ? <p className="mb-3 text-sm text-red-600">{sp.error}</p> : null}
      {devSeed ? (
        <Card className="mb-3">
          <p className="mb-2 text-sm text-zinc-600">Dev seed (ALLOW_DEV_SEED). Idempotent: re-seed resets Seed · rows only.</p>
          <div className="flex gap-2">
            <form action={seedDevData}><Button>Seed demo data</Button></form>
            <form action={resetDevData}><Button variant="ghost">Reset</Button></form>
          </div>
        </Card>
      ) : null}
      {coffees === null ? (
        <Card><p className="text-sm">Supabase not configured yet. Add keys to .env.local and run the migration.</p></Card>
      ) : coffees.length === 0 ? (
        <Card><p className="text-sm text-zinc-600">No coffees yet. Add your first bag.</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {coffees.map((c: { id: string; name: string; remaining_weight_g: number | null }) => (
            <li key={c.id}>
              <Link href={`/coffees/${c.id}`}>
                <Card>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-zinc-600">
                    {c.remaining_weight_g != null ? `~${c.remaining_weight_g} g remaining` : "remaining unknown"}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
