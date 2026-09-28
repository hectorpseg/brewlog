import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/supabase/require-user";
import { listCoffeesPage } from "@/lib/db/queries";
import { resetDevData, seedDevData } from "@/app/actions";
import { ApplyListPrefs, ListSearchBox, ListSortSelect, NoListMatches } from "@/components/list-controls";
import { EntityCard } from "@/components/entity-card";
import { BrewCoffeeAction } from "@/components/quick-actions";
import { Button, Card } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";
import { PAGE_SIZE, listHref, parseCoffeeParams } from "@/lib/lists/params";

type SP = Record<string, string | string[] | undefined>;

export default async function CoffeesPage({ searchParams }: { searchParams: Promise<SP & { error?: string }> }) {
  const sp = await searchParams;
  const p = parseCoffeeParams(sp);
  // Full list state survives the login bounce (?next= carries the query).
  await requireUser(listHref("/coffees", { q: p.q, sort: p.sort, count: p.count }));
  const params = { q: p.q, sort: p.sort, count: p.count };
  const explicit = { sort: "sort" in sp ? p.sort : undefined };
  const coffees = await listCoffeesPage({ q: p.q, sort: p.sort, limit: p.count, offset: 0 }).catch(() => null);
  const filtered = p.q !== "";
  const rows = coffees?.rows ?? [];
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
      <ApplyListPrefs list="coffees" base="/coffees" params={params} explicit={explicit} />
      {coffees === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : (
        <>
          <ListSearchBox
            id="coffee-search"
            label="Search coffees"
            placeholder="Name, origin, process…"
            base="/coffees"
            params={params}
          />
          <ListSortSelect
            base="/coffees"
            params={params}
            list="coffees"
            options={[
              { value: "recent", label: "Recently added" },
              { value: "name", label: "Name A–Z" },
            ]}
          />
          {rows.length === 0 ? (
            <div className="mt-2">
              {filtered ? (
                <NoListMatches query={p.q} base="/coffees" params={params} />
              ) : (
                <EmptyState
                  title="No coffees yet."
                  body="Add a coffee to start logging brews."
                  actionHref="/coffees/new"
                  actionLabel="+ Coffee"
                />
              )}
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {rows.map((c) => (
                <li key={String(c.id)} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <EntityCard href={`/coffees/${String(c.id)}`} label={`${String(c.name)} - view and edit`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{String(c.name)}</div>
                          <div className="tnum text-sm text-ink2">
                            {c.remaining_weight_g != null ? `~${String(c.remaining_weight_g)} g remaining` : "remaining unknown"}
                          </div>
                        </div>
                        <ChevronRight size={20} aria-hidden className="shrink-0 text-ink3" />
                      </div>
                    </EntityCard>
                  </div>
                  <BrewCoffeeAction coffeeId={String(c.id)} coffeeName={String(c.name)} />
                </li>
              ))}
            </ul>
          )}
          {coffees.hasMore ? (
            <div className="mt-3 text-center">
              <Link
                href={listHref("/coffees", { ...params, count: p.count + PAGE_SIZE })}
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
