import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { getCoffee, listBrewsPage } from "@/lib/db/queries";
import { BrewCard } from "@/components/brew-card";
import { ApplyListPrefs, FilterChips, ListSearchBox, ListSortSelect, NoListMatches } from "@/components/list-controls";
import { Card } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";
import { PAGE_SIZE, listHref, parseBrewsParams } from "@/lib/lists/params";

type SP = Record<string, string | string[] | undefined>;

// Server-side list: search/filter/sort/pagination all run against brews_list
// (one flat query, limit+1 for hasMore). The URL is the state — refresh and
// back/forward preserve it; prefs fill in sort/filter only when absent.
export default async function BrewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("/brews");
  const sp = await searchParams;
  const p = parseBrewsParams(sp);
  const params = { q: p.q, sort: p.sort, session: p.session, coffee: p.coffee, count: p.count };
  const explicit = {
    sort: "sort" in sp ? p.sort : undefined,
    session: "session" in sp ? p.session : undefined,
  };
  const [page, coffee] = await Promise.all([
    listBrewsPage({ coffeeId: p.coffee, session: p.session, q: p.q, sort: p.sort, limit: p.count, offset: 0 }).catch(() => null),
    p.coffee ? getCoffee(p.coffee).catch(() => null) : Promise.resolve(null),
  ]);
  const filtered = p.q !== "" || p.session !== "all" || p.coffee !== "";
  const rows = page?.rows ?? [];
  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl">Brews</h1>
      </div>
      <ApplyListPrefs list="brews" base="/brews" params={params} explicit={explicit} />
      {page === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : (
        <>
          <ListSearchBox
            id="brew-search"
            label="Search brews"
            placeholder="Coffee, session, date, notes…"
            base="/brews"
            params={params}
          />
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="flex-1">
              <ListSortSelect
                base="/brews"
                params={params}
                list="brews"
                options={[
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                ]}
              />
            </div>
          </div>
          <FilterChips
            base="/brews"
            params={params}
            param="session"
            list="brews"
            options={[
              { value: "all", label: "All brews" },
              { value: "none", label: "No session" },
            ]}
          />
          {p.coffee ? (
            <div className="mt-2">
              <Link
                href={listHref("/brews", { ...params, coffee: "" }, true)}
                replace
                scroll={false}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line bg-card px-4 text-sm text-ink2 active:scale-[0.97]"
              >
                Coffee: {typeof coffee?.name === "string" ? coffee.name : "selected"} · clear
              </Link>
            </div>
          ) : null}
          {rows.length === 0 ? (
            <div className="mt-2">
              {filtered ? (
                <NoListMatches query={p.q || "these filters"} base="/brews" params={params} />
              ) : (
                <EmptyState
                  title="No brews yet."
                  body="Log your first brew to start building your brew history."
                  actionHref="/brews/new"
                  actionLabel="+ Brew"
                />
              )}
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {rows.map((b) => (
                <li key={String(b.id)}><BrewCard brew={b as React.ComponentProps<typeof BrewCard>["brew"]} /></li>
              ))}
            </ul>
          )}
          {page.hasMore ? (
            <div className="mt-3 text-center">
              <Link
                href={listHref("/brews", { ...params, count: p.count + PAGE_SIZE })}
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
      {rows.length >= 2 ? (
        <Link href={`/brews/compare?a=${String(rows[0].id)}&b=${String(rows[1].id)}`} className="mt-4 inline-block min-h-11 px-2 py-2 text-sm font-medium text-ember underline">
          Compare brews
        </Link>
      ) : null}
    </div>
  );
}
