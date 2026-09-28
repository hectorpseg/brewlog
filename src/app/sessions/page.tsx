import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/supabase/require-user";
import { listSessionsPage } from "@/lib/db/queries";
import { ApplyListPrefs, FilterChips, ListSearchBox, ListSortSelect, NoListMatches, SavedPresets } from "@/components/list-controls";
import { EntityCard } from "@/components/entity-card";
import { Card, SectionHeader } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";
import { PAGE_SIZE, listHref, parseSessionParams } from "@/lib/lists/params";

type SP = Record<string, string | string[] | undefined>;

export default async function SessionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const p = parseSessionParams(sp);
  // Full list state survives the login bounce (?next= carries the query).
  await requireUser(listHref("/sessions", { q: p.q, sort: p.sort, has: p.has, count: p.count }));
  const params = { q: p.q, sort: p.sort, has: p.has, count: p.count };
  const explicit = {
    sort: "sort" in sp ? p.sort : undefined,
    has: "has" in sp ? p.has : undefined,
  };
  const sessions = await listSessionsPage({ q: p.q, sort: p.sort, has: p.has, limit: p.count, offset: 0 }).catch(() => null);
  const filtered = p.q !== "" || p.has !== "all";
  const rows = sessions?.rows ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Sessions</h1>
        <Link href="/sessions/new" className="min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white">
          + Session
        </Link>
      </div>
      <ApplyListPrefs list="sessions" base="/sessions" params={params} explicit={explicit} />
      <div>
        <SectionHeader>Past sessions</SectionHeader>
        {sessions === null ? (
          <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
        ) : (
          <>
            <ListSearchBox
              id="session-search"
              label="Search sessions"
              placeholder="Title, notes…"
              base="/sessions"
              params={params}
            />
            <ListSortSelect
              base="/sessions"
              params={params}
              list="sessions"
              options={[
                { value: "recent", label: "Recently added" },
                { value: "title", label: "Title A–Z" },
              ]}
            />
            <FilterChips
              base="/sessions"
              params={params}
              param="has"
              list="sessions"
              options={[
                { value: "all", label: "All sessions" },
                { value: "brews", label: "Has brews" },
                { value: "empty", label: "Empty" },
              ]}
            />
            <SavedPresets
              base="/sessions"
              params={params}
              list="sessions"
              current={{ sort: p.sort, has: p.has }}
            />
            {rows.length === 0 ? (
              <div className="mt-2">
                {filtered ? (
                  <NoListMatches query={p.q || "these filters"} base="/sessions" params={params} />
                ) : (
                  <EmptyState
                    title="No sessions yet."
                    body="Use a session to group related brews."
                    actionHref="/sessions/new"
                    actionLabel="Create session"
                  />
                )}
              </div>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {rows.map((s) => {
                  const n = Number(s.brew_count ?? 0);
                  return (
                    <li key={String(s.id)}>
                      <EntityCard href={`/sessions/${String(s.id)}`} label={String(s.title)}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{String(s.title)}</div>
                            {typeof s.notes === "string" && s.notes !== "" ? (
                              <div className="mt-0.5 text-sm text-ink2">{s.notes}</div>
                            ) : null}
                            <div className="tnum mt-0.5 text-sm text-ink2">{n} {n === 1 ? "brew" : "brews"}</div>
                          </div>
                          <ChevronRight size={20} aria-hidden className="shrink-0 text-ink3" />
                        </div>
                      </EntityCard>
                    </li>
                  );
                })}
              </ul>
            )}
            {sessions.hasMore ? (
              <div className="mt-3 text-center">
                <Link
                  href={listHref("/sessions", { ...params, count: p.count + PAGE_SIZE })}
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
    </div>
  );
}
