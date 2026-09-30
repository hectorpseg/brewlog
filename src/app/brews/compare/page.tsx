import { getBrew, listBrewIds, listTastings, listPours } from "@/lib/db/queries";
import { diffBrews } from "@/lib/domain/compare";
import { COMPARE_NOTE_FIELDS, COMPARE_RECIPE_FIELDS, resolveCompareIds, toComparableBrew } from "@/lib/domain/brew-diff";
import { compareTastings } from "@/lib/domain/tastings";
import { comparePourFields } from "@/lib/domain/pours";
import { TastingCompare } from "@/components/tasting-compare";
import { CompareFieldTable, type CompareFieldRow } from "@/components/compare-fields";
import { Card, SectionHeader } from "@/components/ui/controls";
import { ErrorState } from "@/components/states";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  // Auth guard lives in the layout above (single requireUser per render,
  // shared via the cached lookup). Deep links (?a=&b=) survive: the layout
  // redirects anonymous users to /login?next=/brews/compare.
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
  // pours feed both the scalar diff (actual ratio) and the pour table
  const [poursA, poursB] = await Promise.all([
    listPours(rawA.id).catch(() => []),
    listPours(rawB.id).catch(() => []),
  ]);
  // ponytail: relations resolved to names before diffing — the diff only ever
  // sees scalar strings, so UUIDs and [object Object] cannot reach the UI.
  const a = toComparableBrew(rawA, poursA);
  const b = toComparableBrew(rawB, poursB);
  const changedKeys = new Set(diffBrews(a, b).changed);
  const rowsFor = (fields: readonly string[]): CompareFieldRow[] =>
    fields
      .map((label) => ({ label, a: a[label], b: b[label], changed: changedKeys.has(label) }))
      // hidden when both sides are absent ("-" = unrecorded) or both flagged
      // "No": false is the not-null default, so two No's carry no signal.
      .filter((r) => (r.a !== "-" || r.b !== "-") && !(r.a === "No" && r.b === "No"));
  const recipe = rowsFor(COMPARE_RECIPE_FIELDS);
  const notes = rowsFor(COMPARE_NOTE_FIELDS);
  // structured tasting compares separately: Stage → Attribute → A / B.
  // Legacy fixed attributes are gone from the scalar diff above on purpose.
  const [tastingsA, tastingsB] = await Promise.all([
    listTastings(rawA.id).catch(() => []),
    listTastings(rawB.id).catch(() => []),
  ]);
  const tasting = compareTastings(tastingsA, tastingsB);
  // Water accounting leads the pours section: actual poured water (from the
  // pouredTotalG domain calc via the scalar map) and numeric bypass sit
  // directly above the per-pour rows. Planned water stays in the Recipe list.
  const waterRows: CompareFieldRow[] = [
    { label: "Poured water", a: a.Poured, b: b.Poured, changed: a.Poured !== b.Poured },
    { label: "Bypass (g)", a: a["Bypass (g)"], b: b["Bypass (g)"], changed: a["Bypass (g)"] !== b["Bypass (g)"] },
  ].filter((r) => r.a !== "-" || r.b !== "-");
  const pourRows: CompareFieldRow[] = [
    ...waterRows,
    ...comparePourFields(
      poursA,
      poursB,
      // Switch positions only make sense (and only display) when one of the
      // compared brews actually uses the Hario Switch.
      rawA.hario_switch === true || rawB.hario_switch === true,
    ),
  ];
  const changedCount = [...changedKeys].filter((k) => a[k] !== "-" || b[k] !== "-").length;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="tnum mt-1 text-sm text-ink2">
          {a.Coffee} · {a.Ratio} → {b.Ratio}
          {" · "}{changedCount} change{changedCount === 1 ? "" : "s"}
        </p>
      </div>
      <div>
        <SectionHeader>Recipe</SectionHeader>
        <Card className="mt-2">
          <CompareFieldTable rows={recipe} />
        </Card>
      </div>
      {pourRows.length > 0 ? (
        <div>
          <SectionHeader>Pours &amp; water</SectionHeader>
          <Card className="mt-2">
            <CompareFieldTable rows={pourRows} />
          </Card>
        </div>
      ) : null}
      <div>
        <SectionHeader>Tasting</SectionHeader>
        {tasting.length === 0 ? (
          <p className="mt-2 text-sm text-ink2">No tasting entries yet - rate Hot, Warm, Cold on each brew.</p>
        ) : (
          <Card className="mt-2">
            <TastingCompare aLabel="Brew A" bLabel="Brew B" stages={tasting} />
          </Card>
        )}
      </div>
      <div>
        <SectionHeader>Notes</SectionHeader>
        {notes.length === 0 ? (
          <p className="mt-2 text-sm text-ink2">No notes on either brew.</p>
        ) : (
          <Card className="mt-2">
            <CompareFieldTable rows={notes} />
          </Card>
        )}
      </div>
    </div>
  );
}
