import { getBrew, listBrewIds } from "@/lib/db/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { diffBrews } from "@/lib/domain/compare";
import { resolveCompareIds, toComparableBrew } from "@/lib/domain/brew-diff";
import { Card, SectionHeader } from "@/components/ui/controls";
import { ErrorState } from "@/components/states";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  await requireUser("/brews/compare");
  const sp = await searchParams;
  // Common path (dropdown change, deep link): fetch exactly the two compared
  // brews. The 50-row selector dataset lives in the layout and is not
  // reloaded here. Identical ?a=&b= collapses to A-only so B re-derives.
  const wantA = sp.a ?? null;
  const wantB = sp.b && sp.b !== sp.a ? sp.b : null;
  const [firstA, firstB] = await Promise.all([
    wantA ? getBrew(wantA).catch(() => null) : Promise.resolve(null),
    wantB ? getBrew(wantB).catch(() => null) : Promise.resolve(null),
  ]);
  let rawA = firstA;
  let rawB = firstB;
  if (!rawA || !rawB) {
    // Missing params or a stale/deleted id: fall back like before, keeping
    // whichever side (if any) still resolves. The id list is scalars only.
    const ids = await listBrewIds().catch(() => [] as string[]);
    const resolved = resolveCompareIds(ids, rawA ? wantA : null, rawB ? wantB : null);
    if (!resolved) {
      return (
        <ErrorState
          title="Need two brews"
          body="Log at least two brews before comparing."
          backHref="/brews"
          backLabel="Back to brews"
        />
      );
    }
    const { aId, bId } = resolved;
    [rawA, rawB] = await Promise.all([getBrew(aId).catch(() => null), getBrew(bId).catch(() => null)]);
    if (!rawA || !rawB) {
      return (
        <ErrorState
          title="Brews not found"
          body="One of them may have been deleted."
          backHref="/brews"
          backLabel="Back to brews"
        />
      );
    }
  }
  // ponytail: relations resolved to names before diffing — the diff only ever
  // sees scalar strings, so UUIDs and [object Object] cannot reach the UI.
  const a = toComparableBrew(rawA);
  const b = toComparableBrew(rawB);
  const diff = diffBrews(a, b);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="tnum mt-1 text-sm text-ink2">
          {a.Coffee} · {a.Ratio} → {b.Ratio}
          {" · "}{diff.changed.length} change{diff.changed.length === 1 ? "" : "s"}
        </p>
      </div>
      <div>
        <SectionHeader>What changed</SectionHeader>
        {diff.changed.length === 0 ? (
          <p className="mt-2 text-sm text-ink2">Identical recipes - the difference is in the cup.</p>
        ) : (
          <Card className="mt-2">
            <ul className="flex flex-col gap-2 text-sm">
              {diff.changed.map((k) => (
                <li key={k}>
                  <span className="text-ink2">{k}</span>
                  <br />
                  <span className="tnum font-medium text-ember">{a[k]} → {b[k]}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <div>
        <SectionHeader>What stayed the same</SectionHeader>
        {diff.same.length === 0 ? (
          <p className="mt-2 text-sm text-ink2">Nothing - every attribute differs.</p>
        ) : (
          <Card className="mt-2">
            <ul className="flex flex-col gap-2 text-sm">
              {diff.same.map((k) => (
                <li key={k} className="tnum flex items-baseline justify-between gap-2">
                  <span className="text-ink2">{k}</span>
                  <span className="text-right font-medium">{a[k]}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
