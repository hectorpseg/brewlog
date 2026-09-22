import { requireUser } from "@/lib/supabase/require-user";
import { listCoffees } from "@/lib/db/queries";
import { createCupping } from "@/app/actions";
import { CuppingForm } from "@/components/cupping-editor";
import { BackLink } from "@/components/back-link";

export default async function NewCuppingPage({ searchParams }: { searchParams: Promise<{ coffee?: string }> }) {
  const sp = await searchParams;
  const here = `/cuppings/new${sp.coffee ? `?coffee=${encodeURIComponent(sp.coffee)}` : ""}`;
  await requireUser(here);
  const coffees = await listCoffees().catch(() => []);
  return (
    <div>
      <BackLink href={sp.coffee ? `/coffees/${sp.coffee}` : "/cuppings"} label={sp.coffee ? "Coffee" : "Cuppings"} />
      <h1 className="mb-3 font-display text-2xl">New cupping</h1>
      <CuppingForm
        action={createCupping}
        coffees={coffees.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
        initialCoffeeId={sp.coffee}
        submitLabel="Save cupping"
        idPrefix="cup-new"
      />
    </div>
  );
}
