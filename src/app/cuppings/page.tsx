import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listCuppingsPage } from "@/lib/db/queries";
import { ApplyListPrefs, ListNavProvider, ListSearchBox, ListSortPills, NoListMatches } from "@/components/list-controls";
import { CuppingList, type CuppingCardData } from "@/components/cupping-card";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/controls";
import { PAGE_SIZE, listHref, parseCuppingParams } from "@/lib/lists/params";

type SP = Record<string, string | string[] | undefined>;

const SECTION_LABEL = "mb-0 text-[11px] font-medium tracking-wide text-ink3 uppercase";

export default async function CuppingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const p = parseCuppingParams(sp);
  // Full list state survives the login bounce (?next= carries the query).
  await requireUser(listHref("/cuppings", { q: p.q, sort: p.sort, count: p.count }));
  const params = { q: p.q, sort: p.sort, count: p.count };
  const explicit = { sort: "sort" in sp ? p.sort : undefined };
  const cuppings = await listCuppingsPage({ q: p.q, sort: p.sort, limit: p.count, offset: 0 }).catch(() => null);
  const filtered = p.q !== "";
  const rows: CuppingCardData[] = (
    (cuppings?.rows ?? []) as (Record<string, unknown> & { coffee_id?: unknown; coffee_name?: unknown } & { id: string })[
    ]
  ).map((c) => ({
    cupping: c as CuppingCardData["cupping"],
    coffeeId: typeof c.coffee_id === "string" ? c.coffee_id : "",
    coffeeName: typeof c.coffee_name === "string" && c.coffee_name !== "" ? c.coffee_name : "Coffee",
  }));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-2xl">Cuppings</h1>
        <Link href="/cuppings/new" className="min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white">
          + Cupping
        </Link>
      </div>
      <ApplyListPrefs list="cuppings" base="/cuppings" params={params} explicit={explicit} />
      {cuppings === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : (
        <ListNavProvider>
          <ListSearchBox
            id="cupping-search"
            label="Search cuppings"
            placeholder="Coffee, grinder, date, notes…"
            base="/cuppings"
            params={params}
            labelClassName={SECTION_LABEL}
            className="placeholder:text-[11px] placeholder:font-medium placeholder:tracking-wide placeholder:text-ink3"
          />
          <ListSortPills
            base="/cuppings"
            params={params}
            list="cuppings"
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
          <CuppingList rows={rows}>
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
          </CuppingList>
          {cuppings.hasMore ? (
            <div className="mt-3 text-center">
              <Link
                href={listHref("/cuppings", { ...params, count: p.count + PAGE_SIZE })}
                replace
                scroll={false}
                className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-card px-4 font-medium transition-transform duration-150 active:scale-[0.97]"
              >
                Show more
              </Link>
            </div>
          ) : null}
        </ListNavProvider>
      )}
    </div>
  );
}
