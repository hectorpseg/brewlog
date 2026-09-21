import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth";
import { getBrew, listBrews } from "@/lib/db/queries";
import { diffBrews } from "@/lib/domain/compare";
import { resolveCompareIds, toComparableBrew } from "@/lib/domain/brew-diff";
import { formatRatio } from "@/lib/domain/ratio";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { Card, SectionHeader } from "@/components/ui/controls";
import { CompareSelectors } from "@/components/compare-selectors";
import { ErrorState } from "@/components/states";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect(loginUrl("/brews"));
  const sp = await searchParams;
  // one list query feeds the selectors; the two compared brews load targeted.
  const all = await listBrews().catch(() => []);
  const options = all.map((b: {
    id: string; dose_g: number; water_g: number; brewed_at: string | null;
    created_at: string; coffees: { name: string } | { name: string }[] | null;
  }) => {
    const coffee = Array.isArray(b.coffees) ? b.coffees[0]?.name : b.coffees?.name;
    return {
      id: b.id,
      label: `${formatRatio(Number(b.dose_g), Number(b.water_g))} · ${coffee ?? "Coffee"} · ${formatBrewDate(b.brewed_at ?? b.created_at)}`,
    };
  });
  const ids = options.map((o) => o.id);
  // defaults: latest two. Explicit params win when they point at real brews.
  const resolved = resolveCompareIds(ids, sp.a, sp.b);
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
  const [rawA, rawB] = await Promise.all([getBrew(aId).catch(() => null), getBrew(bId).catch(() => null)]);
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
  // ponytail: relations resolved to names before diffing — the diff only ever
  // sees scalar strings, so UUIDs and [object Object] cannot reach the UI.
  const a = toComparableBrew(rawA);
  const b = toComparableBrew(rawB);
  const diff = diffBrews(a, b);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">Compare</h1>
        <p className="tnum mt-1 text-sm text-ink2">
          {a.Coffee} · {a.Ratio} → {b.Ratio}
          {" · "}{diff.changed.length} change{diff.changed.length === 1 ? "" : "s"}
        </p>
      </div>
      <CompareSelectors brews={options} aId={aId} bId={bId} />
      <div>
        <SectionHeader>What changed</SectionHeader>
        {diff.changed.length === 0 ? (
          <p className="mt-2 text-sm text-ink2">Identical recipes — the difference is in the cup.</p>
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
        <p className="tnum mt-2 text-sm text-ink2">
          {diff.same.join(" · ") || "nothing"}
        </p>
      </div>
    </div>
  );
}
