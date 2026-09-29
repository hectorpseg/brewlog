"use client";
import { createContext, useContext, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link, { useLinkStatus } from "next/link";
import { ChevronDown, Coffee } from "lucide-react";
import { Label, Select } from "./ui/controls";
import { NoMatches, SearchField } from "./search-field";
import { listHref } from "@/lib/lists/params";
import { toggleFavorite } from "@/app/actions";
import { BrewCard, type BrewCardData } from "./brew-card";
import { CoffeeCard, CoffeeListSkeleton, type CoffeeCardData } from "./coffee-card";
import { cn } from "./ui/utils";
import { mergeStoredPrefs, readListPrefs, writeListPrefs, type ListName, type ListPrefs } from "@/lib/lists/prefs";

// List navigation runs inside a transition so isPending stays true for the
// whole server round trip: the list shows its skeleton while search, filter,
// or sort refetch, and the controls stay usable. Pages without the provider
// (sessions) fall back to a plain replace.
type ListNav = { isPending: boolean; navigate: (href: string) => void };
const ListNavContext = createContext<ListNav | null>(null);

export function ListNavProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const navigate = (href: string) => {
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };
  return <ListNavContext.Provider value={{ isPending, navigate }}>{children}</ListNavContext.Provider>;
}

export function useListNav(): ListNav {
  const ctx = useContext(ListNavContext);
  const router = useRouter();
  return { isPending: ctx?.isPending ?? false, navigate: ctx?.navigate ?? ((href: string) => router.replace(href, { scroll: false })) };
}
function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

type Params = Record<string, string | number>;

// Last-used list state. On mount, keys absent from the URL inherit the stored
// prefs. When `persist` is set (the brew list), those same keys are written
// back on every state change so search, sort, and active filters survive a
// fresh visit. Pagination is never persisted.
export function ApplyListPrefs({ list, base, params, explicit, persist }: {
  list: ListName;
  base: string;
  params: Params;
  explicit: ListPrefs;
  persist?: readonly (keyof ListPrefs)[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);
  const keys = persist ?? (["sort", "session", "has", "fav"] as (keyof ListPrefs)[]);
  const stateKey = keys.map((k) => String(params[k] ?? "")).join("\u0000");
  useEffect(() => {
    if (pathname !== base) return;
    let merged: Params = { ...params };
    if (!done.current) {
      done.current = true;
      const stored = readListPrefs(storage(), list);
      const res = mergeStoredPrefs(merged, explicit, stored, keys);
      merged = res.merged;
      if (res.changed) router.replace(listHref(base, merged), { scroll: false });
    }
    if (persist) {
      const next: ListPrefs = { ...readListPrefs(storage(), list) };
      for (const k of keys) next[k] = String(merged[k] ?? "");
      writeListPrefs(storage(), list, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey, pathname]);
  return null;
}

// Server executes the search; typing only debounces the URL push.
export function ListSearchBox({ id, label, placeholder, base, params, labelClassName, className }: {
  id: string;
  label: string;
  placeholder: string;
  base: string;
  params: Params;
  labelClassName?: string;
  className?: string;
}) {
  const { navigate } = useListNav();
  const [local, setLocal] = useState(String(params.q ?? ""));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prop-to-state sync for external URL changes (e.g. Clear search): the
  // debounced pushes below originate here, guarded by the equality check,
  // so this cannot loop.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLocal(String(params.q ?? "")), [params.q]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const push = (next: string) => {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next !== String(params.q ?? "")) {
        navigate(listHref(base, { ...params, q: next }, true));
      }
    }, 300);
  };
  return <SearchField id={id} label={label} placeholder={placeholder} value={local} onChange={push} labelClassName={labelClassName} className={className} />;
}

export function ListSortSelect({ base, params, options, list }: {
  base: string;
  params: Params;
  options: { value: string; label: string }[];
  list: ListName;
}) {
  const { navigate } = useListNav();
  return (
    <div className="mt-3">
      <Label htmlFor={`${list}-sort`}>Sort</Label>
      <Select
        id={`${list}-sort`}
        value={String(params.sort)}
        onChange={(e) => {
          const s = storage();
          writeListPrefs(s, list, { ...readListPrefs(s, list), sort: e.target.value });
          navigate(listHref(base, { ...params, sort: e.target.value }, true));
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
}

function ListSectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-0 text-[11px] font-medium tracking-wide text-ink3 uppercase">{children}</div>;
}

// Compact sort pills for /brews: always visible, immediate optimistic active
// state, and disabled while the list transition is pending.
export function ListSortPills({ base, params, options, list, label = "Sort by" }: {
  base: string;
  params: Params;
  options: { value: string; label: string }[];
  list: ListName;
  label?: string;
}) {
  const { isPending, navigate } = useListNav();
  const [, startTransition] = useTransition();
  const [optimisticSort, setOptimisticSort] = useOptimistic(String(params.sort));
  return (
    <div className="mt-2">
      <ListSectionLabel>{label}</ListSectionLabel>
      <div className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Sort options">
        {options.map((o) => {
          const on = optimisticSort === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={isPending}
              onClick={() => {
                if (on || isPending) return;
                startTransition(() => {
                  setOptimisticSort(o.value);
                  const s = storage();
                  writeListPrefs(s, list, { ...readListPrefs(s, list), sort: o.value });
                  navigate(listHref(base, { ...params, sort: o.value }, true));
                });
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.96] disabled:opacity-60",
                on
                  ? "bg-ember text-white"
                  : "border border-line bg-card text-ink2 hover:bg-paper"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type BrewListRow = BrewCardData & { coffee_id?: unknown; is_favorite?: unknown };

// Skeleton resembling the compact brew cards it replaces.
function BrewListSkeleton() {
  return (
    <div className="mt-3 flex flex-col gap-2" role="status" aria-label="Loading brews">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-[10px] border border-line bg-card px-3 py-2">
          <div className="skeleton h-4 w-2/5" />
          <div className="skeleton mt-1.5 h-3 w-3/5" />
          <div className="skeleton mt-1 h-3 w-1/2" />
          <div className="skeleton mt-1.5 h-3 w-2/5" />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <div className="skeleton h-7 w-28 rounded-full" />
            <div className="skeleton h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrewList({ rows, children }: { rows: BrewListRow[]; children?: React.ReactNode }) {
  const { isPending } = useListNav();
  if (isPending) return <BrewListSkeleton />;
  if (rows.length === 0) return <div className="mt-2">{children}</div>;
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {rows.map((b) => (
        <BrewListItem key={String(b.id)} b={b} />
      ))}
    </ul>
  );
}

export function CoffeeList({ rows, children }: { rows: CoffeeCardData[]; children?: React.ReactNode }) {
  const { isPending } = useListNav();
  if (isPending) return <CoffeeListSkeleton />;
  if (rows.length === 0) return <div className="mt-2">{children}</div>;
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {rows.map((c) => (
        <li key={c.id}>
          <CoffeeCard coffee={c} />
        </li>
      ))}
    </ul>
  );
}

function BrewListItem({ b }: { b: BrewListRow }) {
  const [isPending, startTransition] = useTransition();
  const coffeeId = typeof b.coffee_id === "string" ? b.coffee_id : null;
  const isFav = b.is_favorite === true;
  const [optimisticFav, setOptimisticFav] = useOptimistic(isFav);
  const next = !optimisticFav;
  return (
    <li className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <BrewCard
          brew={b}
          isFavorite={optimisticFav}
          favoritePending={isPending}
          onFavoriteToggle={() => {
            if (isPending) return;
            startTransition(async () => {
              setOptimisticFav(next);
              try {
                await toggleFavorite(String(b.id), next);
              } catch {
                setOptimisticFav(!next);
              }
            });
          }}
          action={<NewFromThis brewId={String(b.id)} coffeeId={coffeeId} />}
        />
      </div>
    </li>
  );
}

type NewFromThisProps = {
  brewId: string;
  coffeeId: string | null;
};
// Pending guard needs no state: useLinkStatus flips only when this link's
// navigation starts, so other rows stay tappable and a re-tap is a no-op
// (the router already targets the same URL). No prefetch, so pending fires.
export function NewFromThis({ brewId, coffeeId }: NewFromThisProps) {
  const href = brewId
    ? `/brews/new?brew=${encodeURIComponent(brewId)}&copy=1`
    : coffeeId
      ? `/brews/new?coffee=${encodeURIComponent(coffeeId)}&copy=1`
      : "/brews/new";
  return (
    <Link
      href={href}
      replace
      prefetch={false}
      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ember/40 bg-ember/5 px-2.5 py-1 text-xs font-medium text-ember transition-transform duration-150 active:scale-[0.97]"
    >
      <Coffee size={13} aria-hidden />
      <NewFromThisLabel />
    </Link>
  );
}

function NewFromThisLabel() {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("pointer-events-none", pending && "opacity-40")} aria-hidden={pending}>
      New from this
    </span>
  );
}
export function NoListMatches({ query, base, list }: { query: string; base: string; params?: Params; list?: ListName }) {
  const { navigate } = useListNav();
  return (
    <NoMatches
      query={query}
      onClear={() => {
        // Full reset: empty URL means every parser default (q, sort, filters,
        // first page). Without wiping the list's remembered prefs, the empty
        // URL would resurrect them on the next visit (sessions has no persist
        // pass to overwrite them; brews rewrites them via ApplyListPrefs).
        if (list) writeListPrefs(storage(), list, {});
        navigate(listHref(base, {}, true));
      }}
    />
  );
}

// Filter link that routes through the list transition (skeleton on the
// list while the server refetches). Renders a real anchor: href stays
// valid for middle-click/copy, keyboard Enter triggers the click.
export function ListFilterLink({ href, children, ...rest }: {
  href: string;
} & React.ComponentProps<typeof Link>) {
  const { navigate } = useListNav();
  return (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
// Horizontally scrollable quick filters under a section label, using the
// canonical pill language (ListSortPills/BrewFilterBar). Tapping the active
// pill toggles back to the unfiltered state — no explicit "All" pill.
export function FilterChips({ base, params, param, options, list }: {
  base: string;
  params: Params;
  param: "session" | "has" | "fav";
  options: { value: string; label: string }[];
  list: ListName;
}) {
  const router = useRouter();
  const active = String(params[param] ?? "all");
  return (
    <div className="mt-2">
      <ListSectionLabel>Filters</ListSectionLabel>
      <div className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filters">
        {options.map((o) => {
          const on = active === o.value;
          const next = on ? "all" : o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const s = storage();
                writeListPrefs(s, list, { ...readListPrefs(s, list), [param]: next });
                router.replace(listHref(base, { ...params, [param]: next }, true), { scroll: false });
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.96]",
                on
                  ? "bg-ember text-white"
                  : "border border-line bg-card text-ink2 hover:bg-paper"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact AND-filter toolbar for /brews. Primary filters are always visible;
// secondary filters share the same pill treatment and appear inline when
// "More filters" is expanded. State is optimistic and controls are disabled
// while the list transition is pending so spam clicks cannot queue conflicting
// navigations; useOptimistic reverts automatically if navigation fails or is
// cancelled.
export function BrewFilterBar({ base, params }: {
  base: string;
  params: Params;
}) {
  const { isPending, navigate } = useListNav();
  const [, startTransition] = useTransition();
  const [showMore, setShowMore] = useState(false);
  const [optimisticParams, setOptimisticParams] = useOptimistic({
    session: params.session,
    fav: params.fav,
    tasted: params.tasted,
    untasted: params.untasted,
    "has-score": params["has-score"],
    "no-score": params["no-score"],
  });

  const hasNoSession = optimisticParams.session === "none";
  const hasFavorites = optimisticParams.fav === "only";
  const hasTasted = optimisticParams.tasted === "1";
  const hasUntasted = optimisticParams.untasted === "1";
  const hasScoreFilter = optimisticParams["has-score"] === "1";
  const hasNoScoreFilter = optimisticParams["no-score"] === "1";

  const toggle = (next: typeof optimisticParams) => {
    if (isPending) return;
    startTransition(() => {
      setOptimisticParams(next);
      navigate(listHref(base, { ...params, ...next }, true));
    });
  };

  const pill = (label: string, active: boolean, onClick: () => void, ariaLabel?: string) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      disabled={isPending}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.96] disabled:opacity-60",
        active
          ? "bg-ember text-white"
          : "border border-line bg-card text-ink2 hover:bg-paper"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-2">
      <ListSectionLabel>Filters</ListSectionLabel>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filters">
        {pill(
          "No session",
          hasNoSession,
          () => toggle({ ...optimisticParams, session: hasNoSession ? "all" : "none" }),
          hasNoSession ? "Show all brews" : "Show brews with no session"
        )}
        {pill(
          "Favorites",
          hasFavorites,
          () => toggle({ ...optimisticParams, fav: hasFavorites ? "all" : "only" }),
          hasFavorites ? "Show all brews" : "Show favorite brews"
        )}
        {pill(
          "Tasted",
          hasTasted,
          () => toggle({ ...optimisticParams, tasted: hasTasted ? "" : "1" }),
          hasTasted ? "Show all brews" : "Show tasted brews"
        )}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className={cn(
            "flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.96]",
            showMore
              ? "bg-ink text-white"
              : "border border-line bg-card text-ink2 hover:bg-paper"
          )}
        >
          More filters
          <ChevronDown size={12} aria-hidden className={cn("transition-transform duration-150", showMore && "rotate-180")} />
        </button>
        {showMore && (
          <>
            {pill("Untasted", hasUntasted, () => toggle({ ...optimisticParams, untasted: hasUntasted ? "" : "1" }))}
            {pill("Has score", hasScoreFilter, () => toggle({ ...optimisticParams, "has-score": hasScoreFilter ? "" : "1" }))}
            {pill("No score", hasNoScoreFilter, () => toggle({ ...optimisticParams, "no-score": hasNoScoreFilter ? "" : "1" }))}
          </>
        )}
      </div>
    </div>
  );
}
