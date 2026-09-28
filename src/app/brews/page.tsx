import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listBrewsPage, listRecentViews } from "@/lib/db/queries";
import { RecentlyViewed } from "@/components/recently-viewed";
import { ApplyListPrefs, ListSearchBox, ListSortSelect, NoListMatches, type BrewListRow } from "@/components/list-controls";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/controls";
import { cn } from "@/components/ui/utils";
import { BrewCard, type BrewCardData } from "@/components/brew-card";
import { toggleFavorite } from "@/app/actions";
import { NewFromThis } from "@/components/list-controls";
import { PAGE_SIZE, listHref, parseBrewsParams } from "@/lib/lists/params";

type SP = Record<string, string | string[] | undefined>;

export default async function BrewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const p = parseBrewsParams(sp);
  await requireUser(listHref("/brews", { q: p.q, sort: p.sort, session: p.session, coffee: p.coffee, fav: p.fav, count: p.count }));
  const params = { q: p.q, sort: p.sort, session: p.session, coffee: p.coffee, fav: p.fav, count: p.count };
  const explicit = {
    sort: "sort" in sp ? p.sort : undefined,
    session: "session" in sp ? p.session : undefined,
    fav: "fav" in sp ? p.fav : undefined,
  };
  const hasNoSession = p.session === "none";
  const hasFavorites = p.fav === "only";
  const hasTasted = p.tasted === "1";

  const [page, recent] = await Promise.all([
    listBrewsPage({ coffeeId: p.coffee, session: p.session, fav: p.fav, q: p.q, sort: p.sort, limit: p.count, offset: 0, tasted: hasTasted }).catch(() => null),
    listRecentViews().catch(() => []),
  ]);
  const rows = page?.rows ?? [];

  const activeFilterLabels: string[] = [];
  if (hasNoSession) activeFilterLabels.push("No session");
  if (hasFavorites) activeFilterLabels.push("Favorites");
  if (hasTasted) activeFilterLabels.push("Tasted");

  const filterCount = activeFilterLabels.length;
  const filtered = p.q !== "" || filterCount > 0 || p.coffee !== "";

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl">Brews</h1>
      </div>
      <ApplyListPrefs list="brews" base="/brews" params={params} explicit={explicit} />
      <RecentlyViewed items={recent} />
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
                  { value: "top", label: "Top rated" },
                ]}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={listHref("/brews", { ...params, session: p.session === "none" ? "all" : "none" })}
                replace
                className={cn(
                  "min-h-11 shrink-0 rounded-full border border-line bg-card px-3 text-sm text-ink2 active:scale-[0.97]",
                  p.session !== "none" ? "border-ember text-ember" : ""
                )}
                aria-pressed={p.session === "none"}
                aria-label={p.session === "none" ? "Show all brews" : "Show brews with no session"}
              >
                No session
              </Link>
              <Link
                href={listHref("/brews", { ...params, fav: p.fav === "only" ? "all" : "only" })}
                replace
                className={cn(
                  "min-h-11 shrink-0 rounded-full border border-line bg-card px-3 text-sm text-ink2 active:scale-[0.97]",
                  p.fav === "only" ? "border-ember text-ember" : ""
                )}
                aria-pressed={p.fav === "only"}
                aria-label={p.fav === "only" ? "Show all brews" : "Show favorite brews"}
              >
                Favorites
              </Link>
              <Link
                href={listHref("/brews", { ...params, tasted: p.tasted === "1" ? "" : "1" })}
                replace
                className={cn(
                  "min-h-11 shrink-0 rounded-full border border-line bg-card px-3 text-sm text-ink2 active:scale-[0.97]",
                  hasTasted ? "border-ember text-ember" : ""
                )}
                aria-pressed={hasTasted}
                aria-label={hasTasted ? "Show all brews" : "Show tasted brews"}
              >
                Tasted
              </Link>
            </div>
            <details className="mt-2 rounded-[10px] border border-line bg-card px-3 py-2">
              <summary className="cursor-pointer py-2 font-medium text-sm text-ink2">
                More filters
              </summary>
              <div className="mt-1 flex flex-col gap-1">
                <Link
                  href={listHref("/brews", { ...params, untasted: "1" })}
                  replace
                  className="flex-1 rounded-[10px] border border-line bg-card px-2 py-1.5 text-center text-xs text-ink2 active:scale-[0.97]"
                >
                  Untasted
                </Link>
                <Link
                  href={listHref("/brews", { ...params, "has-score": "1" })}
                  replace
                  className="flex-1 rounded-[10px] border border-line bg-card px-2 py-1.5 text-center text-xs text-ink2 active:scale-[0.97]"
                >
                  Has score
                </Link>
                <Link
                  href={listHref("/brews", { ...params, "no-score": "1" })}
                  replace
                  className="flex-1 rounded-[10px] border border-line bg-card px-2 py-1.5 text-center text-xs text-ink2 active:scale-[0.97]"
                >
                  No score
                </Link>
              </div>
            </details>
          </div>
          {rows.length === 0 ? (
            <div className="mt-2">
              {filtered ? (
                <NoListMatches query={p.q || "these filters"} base="/brews" params={params} />
              ) : (
                <EmptyState
                  title="No brews found"
                  body="Nothing matches your current search or filters."
                  actionHref="/brews/new"
                  actionLabel="+ Brew"
                />
              )}
            </div>
) : (
            <ul className="mt-2 flex flex-col gap-2">
              {rows.map((b) => {
                const brew = b as BrewListRow;
                const coffeeId = typeof brew.coffee_id === "string" ? brew.coffee_id : null;
                const isFav = brew.is_favorite === true;
                return (
                  <li key={String(brew.id)}>
                    <BrewCard
                      brew={brew as BrewCardData}
                      isFavorite={isFav}
                      onFavoriteToggle={() => toggleFavorite(String(brew.id), !isFav)}
                      action={<NewFromThis coffeeId={coffeeId} />}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          {page.hasMore ? (
            <Link
              href={listHref("/brews", { ...params, count: p.count + PAGE_SIZE }, true)}
              replace
              scroll={false}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-card px-4 font-medium active:scale-[0.97]"
            >
              Show more
            </Link>
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