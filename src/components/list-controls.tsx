"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Label, Select } from "./ui/controls";
import { NoMatches, SearchField } from "./search-field";
import { listHref } from "@/lib/lists/params";
import { readListPrefs, writeListPrefs, type ListName, type ListPrefs } from "@/lib/lists/prefs";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

type Params = Record<string, string | number>;

// Mount-only: keys absent from the URL inherit the stored list prefs
// (sort/filter only — search text and page size stay session state).
export function ApplyListPrefs({ list, base, params, explicit }: {
  list: ListName;
  base: string;
  params: Params;
  explicit: ListPrefs;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || pathname !== base) return;
    done.current = true;
    const stored = readListPrefs(storage(), list);
    const merged: Params = { ...params };
    let changed = false;
    for (const k of ["sort", "session", "has"] as const) {
      if (explicit[k] === undefined && stored[k] !== undefined && stored[k] !== String(params[k] ?? "")) {
        merged[k] = stored[k] as string;
        changed = true;
      }
    }
    if (changed) router.replace(listHref(base, merged), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const router = useRouter();
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
        router.replace(listHref(base, { ...params, q: next }, true), { scroll: false });
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
  const router = useRouter();
  return (
    <div className="mt-3">
      <Label htmlFor={`${list}-sort`}>Sort</Label>
      <Select
        id={`${list}-sort`}
        value={String(params.sort)}
        onChange={(e) => {
          const s = storage();
          writeListPrefs(s, list, { ...readListPrefs(s, list), sort: e.target.value });
          router.replace(listHref(base, { ...params, sort: e.target.value }, true), { scroll: false });
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
}

// Filtered to nothing: echo the query with a working clear (drops q and
// restarts at the first page, keeps sort/filter).
export function NoListMatches({ query, base, params }: { query: string; base: string; params: Params }) {
  const router = useRouter();
  return (
    <NoMatches
      query={query}
      onClear={() => router.replace(listHref(base, { ...params, q: "" }, true), { scroll: false })}
    />
  );
}
// Horizontally scrollable quick filters. Buttons, never gestures: each tap
// is a visible 44px control that rewrites the URL (same server query path).
export function FilterChips({ base, params, param, options, list }: {
  base: string;
  params: Params;
  param: "session" | "has";
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
