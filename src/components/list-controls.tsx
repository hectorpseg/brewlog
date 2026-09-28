"use client";
import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link, { useLinkStatus } from "next/link";
import { Coffee } from "lucide-react";
import { Label, Select } from "./ui/controls";
import { NoMatches, SearchField } from "./search-field";
import { listHref } from "@/lib/lists/params";
import { toggleFavorite } from "@/app/actions";
import { BrewCard, type BrewCardData } from "./brew-card";
import { cn } from "./ui/utils";
import { deletePreset, mergeStoredPrefs, readListPrefs, readSavedPresets, savePreset, writeListPrefs, type ListName, type ListPrefs, type SavedPreset } from "@/lib/lists/prefs";

// List navigation runs inside a transition so isPending stays true for the
// whole server round trip: the list shows its skeleton while search, filter,
// or sort refetch, and the controls stay usable. Pages without the provider
// (sessions, coffees, cuppings) fall back to a plain replace.
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

function useListNav(): ListNav {
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
export function ListSearchBox({ id, label, placeholder, base, params }: {
  id: string;
  label: string;
  placeholder: string;
  base: string;
  params: Params;
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
  return <SearchField id={id} label={label} placeholder={placeholder} value={local} onChange={push} />;
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

export function SavedPresets({ base, params, list, current }: {
  base: string;
  params: Params;
  list: ListName;
  current: ListPrefs;
}) {
  const router = useRouter();
  const [presets, setPresets] = useState<SavedPreset[]>(() => readSavedPresets(storage(), list));
  const [name, setName] = useState("");
  const apply = (p: SavedPreset) => {
    const s = storage();
    writeListPrefs(s, list, { ...readListPrefs(s, list), ...p.prefs });
    router.replace(listHref(base, { ...params, ...p.prefs }, true), { scroll: false });
  };
  return (
    <details className="mt-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-ink2">
        Saved filters{presets.length > 0 ? ` (${presets.length})` : ""}
      </summary>
      <div className="mt-1 flex flex-col gap-2">
        {presets.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => apply(p)}
              className="min-h-11 flex-1 rounded-[10px] border border-line bg-card px-3 text-left text-sm active:scale-[0.99]"
            >
              {p.name}
            </button>
            <button
              type="button"
              aria-label={`Delete saved filter ${p.name}`}
              onClick={() => setPresets(deletePreset(storage(), list, p.name))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-line bg-card text-sm text-ink2 active:scale-[0.97]"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this filter…"
            aria-label="Preset name"
            className="min-h-11 flex-1 rounded-[10px] border border-line bg-card px-3 text-sm"
          />
          <button
            type="button"
            disabled={name.trim() === ""}
            onClick={() => {
              setPresets(savePreset(storage(), list, name, current));
              setName("");
            }}
            className="min-h-11 shrink-0 rounded-[10px] border border-line bg-card px-4 text-sm font-medium active:scale-[0.97] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </details>
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

function BrewListItem({ b }: { b: BrewListRow }) {
  const [isPending, startTransition] = useTransition();
  const coffeeId = typeof b.coffee_id === "string" ? b.coffee_id : null;
  const isFav = b.is_favorite === true;
  return (
    <li className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <BrewCard
          brew={b}
          isFavorite={isFav}
          favoritePending={isPending}
          onFavoriteToggle={() =>
            startTransition(async () => {
              try {
                await toggleFavorite(String(b.id), !isFav);
              } catch {
                // ponytail: no optimistic state to roll back; server rows stay truth
              }
            })
          }
          action={<NewFromThis coffeeId={coffeeId} />}
        />
      </div>
    </li>
  );
}

type NewFromThisProps = {
  coffeeId: string | null;
};
// Pending guard needs no state: useLinkStatus flips only when this link's
// navigation starts, so other rows stay tappable and a re-tap is a no-op
// (the router already targets the same URL). No prefetch, so pending fires.
export function NewFromThis({ coffeeId }: NewFromThisProps) {
  const href = coffeeId ? `/brews/new?coffee=${encodeURIComponent(coffeeId)}&copy=1` : "/brews/new";
  return (
    <Link
      href={href}
      replace
      prefetch={false}
      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ember/40 bg-ember/5 px-2.5 py-1 text-xs font-medium text-ember active:scale-[0.97]"
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
export function NoListMatches({ query, base, params }: { query: string; base: string; params: Params }) {
  const { navigate } = useListNav();
  return (
    <NoMatches
      query={query}
      onClear={() => navigate(listHref(base, { ...params, q: "" }, true))}
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
// Horizontally scrollable quick filters. Buttons, never gestures: each tap
// is a visible 44px control that rewrites the URL (same server query path).
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
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Quick filters">
      {options.map((o) => {
        const on = active === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on) return;
              const s = storage();
              writeListPrefs(s, list, { ...readListPrefs(s, list), [param]: o.value });
              router.replace(listHref(base, { ...params, [param]: o.value }, true), { scroll: false });
            }}
            className={
              on
                ? "min-h-11 shrink-0 rounded-full border border-ink bg-ink px-4 text-sm font-medium text-white active:scale-[0.97]"
                : "min-h-11 shrink-0 rounded-full border border-line bg-card px-4 text-sm text-ink2 active:scale-[0.97]"
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
