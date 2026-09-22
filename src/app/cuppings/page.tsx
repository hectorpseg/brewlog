import { requireUser } from "@/lib/supabase/require-user";
import { listAllCuppings } from "@/lib/db/queries";
import { deleteCupping, updateCupping } from "@/app/actions";
import { Card } from "@/components/ui/controls";
import { CuppingForm, type CuppingRow } from "@/components/cupping-editor";
import { CollectionAction, EntityDisclosure } from "@/components/entity-card";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/states";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { describeDeletion } from "@/lib/domain/deletion";

export default async function CuppingsPage() {
  await requireUser("/cuppings");
  const cuppings = await listAllCuppings().catch(() => null);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl">Cuppings</h1>
        <CollectionAction href="/cuppings/new">+ Cupping</CollectionAction>
      </div>
      {cuppings === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : cuppings.length === 0 ? (
        <EmptyState
          title="No cuppings yet."
          body="Taste a coffee before spending brew doses."
          actionHref="/cuppings/new"
          actionLabel="+ Cupping"
        />
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {(cuppings as (CuppingRow & { coffees: { id: string; name: string } | { id: string; name: string }[] | null })[]).map((c) => {
            const coffee = Array.isArray(c.coffees) ? c.coffees[0] : c.coffees;
            const edit = updateCupping.bind(null, c.id, coffee?.id ?? "");
            const remove = deleteCupping.bind(null, c.id, coffee?.id ?? "");
            const cdel = describeDeletion("cupping", {});
            return (
              <li key={c.id}>
                <EntityDisclosure
                  summary={
                    <>
                      <span className="font-medium">
                        {coffee?.name ?? "Coffee"} · {c.dose_g ?? "?"} g / {c.water_g ?? "?"} g
                      </span>
                      <span className="shrink-0 text-xs text-ink3">{formatBrewDate(c.cupped_at)}</span>
                    </>
                  }
                >
                  <CuppingForm action={edit} cupping={c} submitLabel="Save cupping" idPrefix={`cup-${c.id}`} />
                  <DeleteButton
                    label="Delete cupping"
                    title={cdel.title}
                    body={cdel.body}
                    confirmLabel={cdel.confirm}
                    action={remove}
                  />
                </EntityDisclosure>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
