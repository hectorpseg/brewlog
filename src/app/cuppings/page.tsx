import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listCuppingsPage } from "@/lib/db/queries";
import { deleteCupping, updateCupping } from "@/app/actions";
import { Card } from "@/components/ui/controls";
import { type CuppingRow } from "@/components/cupping-editor";
import { CollectionAction } from "@/components/entity-card";
import { ApplyListPrefs, ListSearchBox, ListSortSelect, NoListMatches } from "@/components/list-controls";
import { CuppingList, type CuppingListItem } from "@/components/cupping-list";
import { EmptyState } from "@/components/states";
import { PAGE_SIZE, listHref, parseCuppingParams } from "@/lib/lists/params";

type SP = Record<string, string | string[] | undefined>;

export default async function CuppingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("/cuppings");
  const sp = await searchParams;
  const p = parseCuppingParams(sp);
  const params = { q: p.q, sort: p.sort, count: p.count };
  const explicit = { sort: "sort" in sp ? p.sort : undefined };
  const cuppings = await listCuppingsPage({ q: p.q, sort: p.sort, limit: p.count, offset: 0 }).catch(() => null);
  const filtered = p.q !== "";
  const items: CuppingListItem[] = (
    (cuppings?.rows ?? []) as (CuppingRow & { coffee_id?: unknown; coffee_name?: unknown })[]
  ).map((c) => {
    const name = typeof c.coffee_name === "string" && c.coffee_name !== "" ? c.coffee_name : "Coffee";
    return {
      cupping: c,
      coffeeId: typeof c.coffee_id === "string" ? c.coffee_id : "",
      coffeeName: name,
      edit: updateCupping.bind(null, c.id, typeof c.coffee_id === "string" ? c.coffee_id : ""),
      remove: deleteCupping.bind(null, c.id, typeof c.coffee_id === "string" ? c.coffee_id : ""),
    };
  });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl">Cuppings</h1>
        <CollectionAction href="/cuppings/new">+ Cupping</CollectionAction>
      </div>
      <ApplyListPrefs list="cuppings" base="/cuppings" params={params} explicit={explicit} />
      {cuppings === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : (
        <>
          <ListSearchBox
            id="cupping-search"
            label="Search cuppings"
            placeholder="Coffee, grinder, date, notes…"
            base="/cuppings"
            params={params}
          />
          <ListSortSelect
            base="/cuppings"
            params={params}
            list="cuppings"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
            ]}
          />
          {items.length === 0 ? (
            <div className="mt-2">
              {filtered ? (
                <NoListMatches query={p.q} base="/cuppings" params={params} />
              ) : (
                <EmptyState
                  title="No cuppings yet."
                  body="Taste a coffee before spending brew doses."
                  actionHref="/cuppings/new"
                  actionLabel="+ Cupping"
                />
              )}
            </div>
          ) : (
            <CuppingList items={items} />
          )}
          {cuppings.hasMore ? (
            <div className="mt-3 text-center">
              <Link
                href={listHref("/cuppings", { ...params, count: p.count + PAGE_SIZE })}
                replace
                scroll={false}
                className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-card px-4 font-medium active:scale-[0.97]"
              >
                Show more
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
