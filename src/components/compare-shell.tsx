"use client";
import { useSearchParams } from "next/navigation";
import { resolveCompareIds } from "@/lib/domain/brew-diff";
import { CompareSelectors } from "./compare-selectors";

// Selectors bound to the URL (?a=&b=), fed by the layout's selector dataset.
// The layout persists across dropdown navigations, so this never refetches —
// it only re-resolves which two ids the URL points at.
export function CompareShell({
  brews,
  children,
}: {
  brews: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const sp = useSearchParams();
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
      {resolved ? <CompareSelectors brews={options} aId={resolved.aId} bId={resolved.bId} /> : null}
      {children}
    </>
  );
}
