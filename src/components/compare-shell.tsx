"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { resolveCompareSelection } from "@/lib/domain/brew-diff";
import { CardSkeleton } from "./states";
import { CompareSelectors } from "./compare-selectors";

// SLOT_PARAMS[i] is the URL param for slot i (?a=&b=&c=&d=).
const SLOT_PARAMS = ["a", "b", "c", "d"];

// Selectors bound to the URL slots, fed by the layout's selector dataset.
// The layout persists across selection navigations, so this never refetches —
// it only re-resolves which ids the URL points at. While the compared brews
// reload, the stale table is replaced by the project skeleton (results area
// only — selectors stay interactive).
export function CompareShell({
  brews,
  children,
}: {
  brews: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  function go(ids: string[]) {
    if (ids.length < 2) return;
    startTransition(() => {
      router.push(`/brews/compare?${ids.map((id, i) => `${SLOT_PARAMS[i]}=${id}`).join("&")}`);
    });
  }
  const wanted = SLOT_PARAMS.map((p) => sp.get(p));
  // Deep links may point at brews outside the latest-50 window: keep the URL
  // ids selectable (stub label) so the selector always agrees with the page.
  const known = new Set(brews.map((b) => b.id));
  const options = [...brews];
  for (const id of wanted) {
    if (id && !known.has(id)) {
      options.push({ id, label: `Brew · ${id.slice(0, 8)}` });
      known.add(id);
    }
  }
  const resolved = resolveCompareSelection(
    options.map((o) => o.id),
    wanted,
  );
  return (
    <>
      {resolved ? <CompareSelectors brews={options} ids={resolved} onChange={go} /> : null}
      {isPending ? (
        <div aria-live="polite" aria-busy="true">
          <CardSkeleton />
        </div>
      ) : (
        children
      )}
    </>
  );
}
