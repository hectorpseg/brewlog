"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { resolveCompareIds } from "@/lib/domain/brew-diff";
import { CardSkeleton } from "./states";
import { CompareSelectors } from "./compare-selectors";

// Selectors bound to the URL (?a=&b=), fed by the layout's selector dataset.
// The layout persists across dropdown navigations, so this never refetches —
// it only re-resolves which two ids the URL points at. While the next
// comparison is loading, the stale table is replaced by the project skeleton
// (results area only — selectors stay interactive).
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
  function go(nextA: string, nextB: string) {
    if (!nextA || !nextB) return;
    startTransition(() => {
      router.push(`/brews/compare?a=${nextA}&b=${nextB}`);
    });
  }
  const wantA = sp.get("a");
  const wantB = sp.get("b");
  // Deep links may point at brews outside the latest-50 window: keep the URL
  // ids selectable (stub label) so the selector always agrees with the page.
  const known = new Set(brews.map((b) => b.id));
  const options = [...brews];
  for (const id of [wantA, wantB]) {
    if (id && !known.has(id)) {
      options.push({ id, label: `Brew · ${id.slice(0, 8)}` });
      known.add(id);
    }
  }
  const resolved = resolveCompareIds(
    options.map((o) => o.id),
    wantA,
    wantB,
  );
  return (
    <>
      {resolved ? <CompareSelectors brews={options} aId={resolved.aId} bId={resolved.bId} onSelect={go} /> : null}
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
