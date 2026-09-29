import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listBrewsPage, listRecentViews } from "@/lib/db/queries";
import { RecentlyViewed } from "@/components/recently-viewed";
import { ApplyListPrefs, BrewFilterBar, BrewList, ListNavProvider, ListSearchBox, ListSortPills, NoListMatches, type BrewListRow } from "@/components/list-controls";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/controls";
import { PAGE_SIZE, listHref, parseBrewsParams } from "@/lib/lists/params";
import { BREWS_LIST_PREF_KEYS, type ListPrefs } from "@/lib/lists/prefs";

type SP = Record<string, string | string[] | undefined>;

const SECTION_LABEL = "mb-0 text-[11px] font-medium tracking-wide text-ink3 uppercase";

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
      <div className="mb-3">
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
            labelClassName={SECTION_LABEL}
            className="placeholder:text-[11px] placeholder:font-medium placeholder:tracking-wide placeholder:text-ink3"
          />
          <ListSortPills
            base="/brews"
            params={params}
            list="brews"
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
              { value: "top", label: "Best rated" },
            ]}
          />
          <BrewFilterBar base="/brews" params={params} />
          <BrewList rows={rows as BrewListRow[]}>
            {filtered ? (
              <NoListMatches query={p.q || "these filters"} base="/brews" params={params} list="brews" />
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
              className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-card px-4 font-medium transition-transform duration-150 active:scale-[0.97]"
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