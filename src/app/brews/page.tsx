import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { requireUser } from "@/lib/supabase/require-user";
import { listBrewsPage, listRecentViews } from "@/lib/db/queries";
import { RecentlyViewed } from "@/components/recently-viewed";
import { ApplyListPrefs, BrewList, ListFilterLink, ListNavProvider, ListSearchBox, ListSortSelect, NoListMatches, type BrewListRow } from "@/components/list-controls";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/controls";
import { cn } from "@/components/ui/utils";
import { PAGE_SIZE, listHref, parseBrewsParams } from "@/lib/lists/params";
import { BREWS_LIST_PREF_KEYS, type ListPrefs } from "@/lib/lists/prefs";

type SP = Record<string, string | string[] | undefined>;

export default async function BrewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const p = parseBrewsParams(sp);
  const params = {
    q: p.q,
    sort: p.sort,
    session: p.session,
    coffee: p.coffee,
    fav: p.fav,
    count: p.count,
    tasted: p.tasted ?? "",
    untasted: p.untasted ?? "",
    "has-score": p.hasScore ?? "",
    "no-score": p.noScore ?? "",
  };
  await requireUser(listHref("/brews", params));
  const explicit: ListPrefs = {
    q: "q" in sp ? p.q : undefined,
    sort: "sort" in sp ? p.sort : undefined,
    session: "session" in sp ? p.session : undefined,
    fav: "fav" in sp ? p.fav : undefined,
    tasted: "tasted" in sp ? (p.tasted ?? "") : undefined,
    untasted: "untasted" in sp ? (p.untasted ?? "") : undefined,
    "has-score": "has-score" in sp ? (p.hasScore ?? "") : undefined,
    "no-score": "no-score" in sp ? (p.noScore ?? "") : undefined,
  };
  const hasNoSession = p.session === "none";
  const hasFavorites = p.fav === "only";
  const hasTasted = p.tasted === "1";
  const hasUntasted = p.untasted === "1";
  const hasScoreFilter = p.hasScore === "1";
  const hasNoScoreFilter = p.noScore === "1";

  const [page, recent] = await Promise.all([
    listBrewsPage({
      coffeeId: p.coffee,
      session: p.session,
      fav: p.fav,
      q: p.q,
      sort: p.sort,
      limit: p.count,
      offset: 0,
      tasted: hasTasted,
      untasted: hasUntasted,
      hasScore: hasScoreFilter,
      noScore: hasNoScoreFilter,
    }).catch(() => null),
    listRecentViews().catch(() => []),
  ]);
  const rows = page?.rows ?? [];

  const activeFilterLabels: string[] = [];
  if (hasNoSession) activeFilterLabels.push("No session");
  if (hasFavorites) activeFilterLabels.push("Favorites");
  if (hasTasted) activeFilterLabels.push("Tasted");
  if (hasUntasted) activeFilterLabels.push("Untasted");
  if (hasScoreFilter) activeFilterLabels.push("Has score");
  if (hasNoScoreFilter) activeFilterLabels.push("No score");

  const filterCount = activeFilterLabels.length;
  const filtered = p.q !== "" || filterCount > 0 || p.coffee !== "";

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl">Brews</h1>
      </div>
      <ApplyListPrefs list="brews" base="/brews" params={params} explicit={explicit} persist={BREWS_LIST_PREF_KEYS} />
      <RecentlyViewed items={recent} />
      {page === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : (
        <ListNavProvider>
          <ListSearchBox
            id="brew-search"
            label="Search brews"
            placeholder="Coffee, session, date, notes…"
            base="/brews"
            params={params}
          />
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
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
            <ListFilterLink
              href={listHref("/brews", { ...params, session: p.session === "none" ? "all" : "none" }, true)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border border-line bg-card px-3 text-sm text-ink2 active:scale-[0.97]",
                p.session === "none" ? "border-ember text-ember" : ""
              )}
              aria-pressed={p.session === "none"}
              aria-label={p.session === "none" ? "Show all brews" : "Show brews with no session"}
            >
              No session
            </ListFilterLink>
            <ListFilterLink
              href={listHref("/brews", { ...params, fav: p.fav === "only" ? "all" : "only" }, true)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border border-line bg-card px-3 text-sm text-ink2 active:scale-[0.97]",
                p.fav === "only" ? "border-ember text-ember" : ""
              )}
              aria-pressed={p.fav === "only"}
              aria-label={p.fav === "only" ? "Show all brews" : "Show favorite brews"}
            >
              Favorites
            </ListFilterLink>
            <ListFilterLink
              href={listHref("/brews", { ...params, tasted: hasTasted ? "" : "1" }, true)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border border-line bg-card px-3 text-sm text-ink2 active:scale-[0.97]",
                hasTasted ? "border-ember text-ember" : ""
              )}
              aria-pressed={hasTasted}
              aria-label={hasTasted ? "Show all brews" : "Show tasted brews"}
            >
              Tasted
            </ListFilterLink>
            <details className="group shrink-0">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-full border border-line bg-card px-3 text-sm text-ink2 active:scale-[0.97]">
                More filters
                <ChevronDown size={14} aria-hidden className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-1 flex w-28 flex-col gap-1.5">
                <ListFilterLink
                  href={listHref("/brews", { ...params, untasted: hasUntasted ? "" : "1" }, true)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full border px-2.5 py-1 text-xs active:scale-[0.97]",
                    hasUntasted ? "border-ember text-ember" : "border-line bg-card text-ink2"
                  )}
                  aria-pressed={hasUntasted}
                >
                  Untasted
                </ListFilterLink>
                <ListFilterLink
                  href={listHref("/brews", { ...params, "has-score": hasScoreFilter ? "" : "1" }, true)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full border px-2.5 py-1 text-xs active:scale-[0.97]",
                    hasScoreFilter ? "border-ember text-ember" : "border-line bg-card text-ink2"
                  )}
                  aria-pressed={hasScoreFilter}
                >
                  Has score
                </ListFilterLink>
                <ListFilterLink
                  href={listHref("/brews", { ...params, "no-score": hasNoScoreFilter ? "" : "1" }, true)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full border px-2.5 py-1 text-xs active:scale-[0.97]",
                    hasNoScoreFilter ? "border-ember text-ember" : "border-line bg-card text-ink2"
                  )}
                  aria-pressed={hasNoScoreFilter}
                >
                  No score
                </ListFilterLink>
              </div>
            </details>
          </div>
          <BrewList rows={rows as BrewListRow[]}>
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
          </BrewList>
          {page.hasMore ? (
            <Link
              href={listHref("/brews", { ...params, count: p.count + PAGE_SIZE })}
              replace
              scroll={false}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-card px-4 font-medium active:scale-[0.97]"
            >
              Show more
            </Link>
          ) : null}
        </ListNavProvider>
      )}
      {rows.length >= 2 ? (
        <Link href={`/brews/compare?a=${String(rows[0].id)}&b=${String(rows[1].id)}`} className="mt-4 inline-block min-h-11 px-2 py-2 text-sm font-medium text-ember underline">
          Compare brews
        </Link>
      ) : null}
    </div>
  );
}