import { requireUser } from "@/lib/supabase/require-user";
import { listAllCuppings } from "@/lib/db/queries";
import { deleteCupping, updateCupping } from "@/app/actions";
import { Card } from "@/components/ui/controls";
import { type CuppingRow } from "@/components/cupping-editor";
import { CollectionAction } from "@/components/entity-card";
import { CuppingList, type CuppingListItem } from "@/components/cupping-list";
import { EmptyState } from "@/components/states";

export default async function CuppingsPage() {
  await requireUser("/cuppings");
  const cuppings = await listAllCuppings().catch(() => null);
  const items: CuppingListItem[] | null = cuppings === null ? null : (
    cuppings as (CuppingRow & { coffees: { id: string; name: string } | { id: string; name: string }[] | null })[]
  ).map((c) => {
    const coffee = Array.isArray(c.coffees) ? c.coffees[0] : c.coffees;
    return {
      cupping: c,
      coffeeId: coffee?.id ?? "",
      coffeeName: coffee?.name ?? "Coffee",
      edit: updateCupping.bind(null, c.id, coffee?.id ?? ""),
      remove: deleteCupping.bind(null, c.id, coffee?.id ?? ""),
    };
  });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl">Cuppings</h1>
        <CollectionAction href="/cuppings/new">+ Cupping</CollectionAction>
      </div>
      {items === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="No cuppings yet."
          body="Taste a coffee before spending brew doses."
          actionHref="/cuppings/new"
          actionLabel="+ Cupping"
        />
      ) : (
        <CuppingList items={items} />
      )}
    </div>
  );
}
