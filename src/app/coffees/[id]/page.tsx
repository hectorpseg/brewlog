import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getCoffee, listBrews, listCuppings } from "@/lib/db/queries";
import { deleteCoffee, deleteCupping, updateCoffee, updateCupping } from "@/app/actions";
import { CoffeeEditor } from "@/components/coffee-editor";
import { BackLink } from "@/components/back-link";
import { CuppingForm, type CuppingRow } from "@/components/cupping-editor";
import { CollectionAction, EntityDisclosure } from "@/components/entity-card";
import { DeleteButton } from "@/components/delete-button";
import { BrewHistoryRow } from "@/components/brew-history-row";
import { EmptyState } from "@/components/states";
import { describeDeletion } from "@/lib/domain/deletion";
import { coffeeDetailLine, coffeeMetaLine } from "@/lib/domain/coffee-meta";
import { formatBrewDate, formatReceived } from "@/lib/domain/brew-date";

export default async function CoffeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/coffees/${id}`);
  const coffee = await getCoffee(id).catch(() => null);
  if (!coffee) notFound();
  // independent reads, one round trip instead of two sequential ones
  const [brews, cuppings] = await Promise.all([
    listBrews(id).catch(() => []),
    listCuppings(id).catch(() => []),
  ]);
  const update = updateCoffee.bind(null, id);
  const noted = brews.filter((b: { observations?: unknown }) => {
    const o = b.observations;
    return Array.isArray(o) ? o.length > 0 : o != null;
  }).length;
  const del = describeDeletion("coffee", { brews: brews.length, observations: noted });
  const remove = deleteCoffee.bind(null, id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/coffees" label="Coffees" />
        <h1 className="font-display text-2xl">{coffee.name}</h1>
        <p className="tnum mt-1 text-sm text-ink2">
          {coffeeMetaLine(coffee)}
        </p>
        {coffeeDetailLine(coffee) ? (
          <p className="tnum mt-0.5 text-sm text-ink2">
            {coffeeDetailLine(coffee)}
          </p>
        ) : null}
        <p className="tnum mt-0.5 text-sm text-ink2">
          ~{coffee.remaining_weight_g ?? "?"} g remaining · Received {formatReceived(coffee.received_date)}
        </p>
        <CoffeeEditor
          coffee={coffee}
          update={update}
          brewAgainHref={brews.length > 0 ? `/brews/new?coffee=${id}&copy=1` : `/brews/new?coffee=${id}`}
        />
      </div>
      <div>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-lg">
            <span className="border-b border-line pb-1 font-display">Brews ({brews.length})</span>
          </summary>
          {brews.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="No brews of this coffee"
                body="Start from the competition defaults and adjust from there."
                actionHref={`/brews/new?coffee=${id}`}
                actionLabel="+ Brew"
              />
            </div>
          ) : (
            <>
              <ul className="mt-2 flex flex-col gap-2">
                {brews.map((b: {
                  id: string; dose_g: number; water_g: number; temp_c: number | null;
                  grind_clicks: number | null; total_time_sec: number | null;
                  brewed_at: string | null; created_at: string; session_id: string | null;
                  session: { title: string } | null; observations: unknown;
                }) => (
                  <li key={b.id}><BrewHistoryRow brew={b} /></li>
                ))}
              </ul>
              <div className="mt-3">
                <CollectionAction href={`/brews/new?coffee=${id}&copy=1`}>+ Brew</CollectionAction>
              </div>
            </>
          )}
        </details>
      </div>
      <div>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-lg">
            <span className="border-b border-line pb-1 font-display">Cuppings ({cuppings.length})</span>
          </summary>
          <p className="mt-1 text-sm text-ink2">
            Taste {coffee.name} before spending brew doses - a baseline for what follows.
          </p>
          {cuppings.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="No cuppings yet"
                body={`Taste ${coffee.name} before spending brew doses.`}
                actionHref={`/cuppings/new?coffee=${id}`}
                actionLabel="+ Cupping"
              />
            </div>
          ) : (
            <>
              <ul className="mt-2 flex flex-col gap-2">
              {(cuppings as CuppingRow[]).map((c) => {
                const edit = updateCupping.bind(null, c.id, id);
                const removeCupping = deleteCupping.bind(null, c.id, id);
                const cdel = describeDeletion("cupping", {});
                return (
                  <li key={c.id}>
                    <EntityDisclosure
                      summary={
                        <>
                          <span className="font-medium">
                            {c.dose_g ?? "?"} g / {c.water_g ?? "?"} g
                          </span>
                          <span className="shrink-0 text-xs text-ink3">{formatBrewDate(c.cupped_at)}</span>
                        </>
                      }
                    >
                      <CuppingForm action={edit} cupping={{ ...c, coffee_id: id }} submitLabel="Save cupping" idPrefix={`cup-${c.id}`} />
                      <DeleteButton
                        label="Delete cupping"
                        title={cdel.title}
                        body={cdel.body}
                        confirmLabel={cdel.confirm}
                        action={removeCupping}
                      />
                    </EntityDisclosure>
                  </li>
                );
              })}
              </ul>
              <div className="mt-3">
                <CollectionAction href={`/cuppings/new?coffee=${id}`}>+ Cupping</CollectionAction>
              </div>
            </>
          )}
        </details>
      </div>
      <DeleteButton
        label="Delete coffee"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
