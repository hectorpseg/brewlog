import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listCoffees } from "@/lib/db/queries";
import { CoffeeList } from "@/components/coffee-list";
import { resetDevData, seedDevData } from "@/app/actions";
import { Button, Card } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";

export default async function CoffeesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/coffees");
  const sp = await searchParams;
  const coffees = await listCoffees().catch(() => null);
  const devSeed = process.env.ALLOW_DEV_SEED === "true";
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl">Coffees</h1>
        <Link href="/coffees/new" className="min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white">+ Coffee</Link>
      </div>
      {sp.error ? (
        <p role="alert" className="mb-3 rounded-[10px] border border-ember px-3 py-2 text-sm text-ember">
          {sp.error}
        </p>
      ) : null}
      {devSeed ? (
        <Card className="mb-3">
          <p className="mb-2 text-sm text-ink2">Dev seed. Re-seeding resets Seed rows only.</p>
          <div className="flex gap-2">
            <form action={seedDevData}><Button>Seed demo data</Button></form>
            <form action={resetDevData}><Button variant="ghost">Reset</Button></form>
          </div>
        </Card>
      ) : null}
      {coffees === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : coffees.length === 0 ? (
        <EmptyState
          title="No coffees yet."
          body="Add a coffee to start logging brews."
          actionHref="/coffees/new"
          actionLabel="+ Coffee"
        />
      ) : (
        <CoffeeList coffees={coffees} />
      )}
    </div>
  );
}
