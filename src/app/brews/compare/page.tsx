import { getBrew, listBrewIds, listTastings, listPours } from "@/lib/db/queries";
import {
  COMPARE_NOTE_FIELDS,
  COMPARE_RECIPE_FIELDS,
  COMPARE_SLOT_KEYS,
  compareRowsFor,
  resolveCompareSelection,
  toComparableBrew,
  valuesChanged,
  type CompareRow,
} from "@/lib/domain/brew-diff";
import { comparePourFields } from "@/lib/domain/pours";
import { compareTastings } from "@/lib/domain/tastings";
import { compareBrewDates, formatCompareSummary } from "@/lib/domain/compare-summary";
import { getT } from "@/lib/i18n/server";
import { TastingCompare } from "@/components/tasting-compare";
import { CompareFieldTable } from "@/components/compare-fields";
import { CompareShareActions } from "@/components/compare-share";
import { Card, SectionHeader } from "@/components/ui/controls";
import { ErrorState } from "@/components/states";

// URL slots (?a=&b=&c=&d=), up to 4 compared brews: one fetched row per
// requested brew, then ?a=2 classic pairs keep working untouched.
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string; c?: string; d?: string }> }) {
  // Auth guard lives in the layout above (single requireUser per render,
  // shared via the cached lookup). Deep links survive: the layout
  // redirects anonymous users to /login?next=/brews/compare.
  const sp = await searchParams;
  const t = await getT();
  // Common path (selector change, deep link): fetch exactly the compared
  // brews. The 50-row selector dataset lives in the layout and is not
  // reloaded here. Duplicate requests collapse to one row per brew.
  const wantIds = [...new Set([sp.a, sp.b, sp.c, sp.d].filter((v): v is string => !!v))];
  const raws = await Promise.all(wantIds.map((id) => getBrew(id).catch(() => null)));
  const byId = new Map<string, Awaited<ReturnType<typeof getBrew>>>();
  wantIds.forEach((id, i) => {
    if (raws[i]) byId.set(id, raws[i]);
  });
  let selection: string[] | null = wantIds.filter((id) => byId.has(id));
  if (selection.length < 2) {
    // Missing params or a stale/deleted id: fall back like before, keeping
    // whichever requested brews (if any) still resolve. The id list is
    // scalars only.
    const ids = await listBrewIds().catch(() => [] as string[]);
    selection = resolveCompareSelection(ids, wantIds);
    if (!selection) {
      return (
        <ErrorState
          title="Need two brews"
          body="Log at least two brews before comparing."
          backHref="/brews"
          backLabel="Back to brews"
        />
      );
    }
    const missing = selection.filter((id) => !byId.has(id));
    const extra = await Promise.all(missing.map((id) => getBrew(id).catch(() => null)));
    missing.forEach((id, i) => {
      if (extra[i]) byId.set(id, extra[i]);
    });
  }
  // Drop requests that never resolved (deleted brews pointing into the
  // fallback list); a comparison needs at least two live brews.
  const ids = selection.filter((id) => byId.has(id));
  if (ids.length < 2) {
    return (
      <ErrorState
        title="Brews not found"
        body="One of them may have been deleted."
        backHref="/brews"
        backLabel="Back to brews"
      />
    );
  }
  const brews = ids.map((id) => byId.get(id)!);
  // pours feed both the scalar diff (actual ratio) and the pour table
  const [pours, tastingRows] = await Promise.all([
    Promise.all(ids.map((id) => listPours(id).catch(() => []))),
    Promise.all(ids.map((id) => listTastings(id).catch(() => []))),
  ]);
  // ponytail: relations resolved to names before diffing — the diff only ever
  // sees scalar strings, so UUIDs and [object Object] cannot reach the UI.
  const scalars = brews.map((b, i) => toComparableBrew(b, pours[i]));
  const labels = ids.map((_, i) => t(COMPARE_SLOT_KEYS[i]));
  const recipe = compareRowsFor(scalars, COMPARE_RECIPE_FIELDS);
  const notes = compareRowsFor(scalars, COMPARE_NOTE_FIELDS);
  // Water accounting leads the pours section: actual poured water (from the
  // pouredTotalG domain calc via the scalar map) and numeric bypass sit
  // directly above the per-pour rows. Planned water stays in the Recipe list.
  const waterRows: CompareRow[] = [
    { label: "Poured water", values: scalars.map((s) => s.Poured ?? "-"), changed: valuesChanged(scalars.map((s) => s.Poured ?? "-")) },
    { label: "Bypass (g)", values: scalars.map((s) => s["Bypass (g)"] ?? "-"), changed: valuesChanged(scalars.map((s) => s["Bypass (g)"] ?? "-")) },
  ].filter((r) => r.values.some((v) => v !== "-"));
  const pourRows: CompareRow[] = [
    ...waterRows,
    ...comparePourFields(
      pours,
      // Switch positions only make sense (and only display) when one of the
      // compared brews actually uses the Hario Switch.
      brews.some((b) => b.hario_switch === true),
    ),
  ];
  const shownChanged = [...recipe, ...notes, ...waterRows].filter((r) => r.changed);
  const changedCount = shownChanged.length;
  const summary = formatCompareSummary(
    scalars,
    compareBrewDates(brews),
    [...shownChanged, ...pourRows.filter((r) => r.changed)],
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="tnum mt-1 text-sm text-ink2">
          {scalars[0].Coffee} · {scalars.map((s) => s.Ratio).join(" · ")}
          {" · "}{changedCount} change{changedCount === 1 ? "" : "s"}
        </p>
        <div className="mt-2">
          <CompareShareActions text={summary} />
        </div>
      </div>
      <div>
        <SectionHeader>Recipe</SectionHeader>
        <Card className="mt-2">
          <CompareFieldTable rows={recipe} labels={labels} />
        </Card>
      </div>
      {pourRows.length > 0 ? (
        <div>
          <SectionHeader>Pours &amp; water</SectionHeader>
          <Card className="mt-2">
            <CompareFieldTable rows={pourRows} labels={labels} />
          </Card>
        </div>
      ) : null}
      <div>
        <SectionHeader>Tasting</SectionHeader>
        {tastingRows.every((rows) => rows.length === 0) ? (
          <p className="mt-2 text-sm text-ink2">No tasting entries yet - rate Hot, Warm, Cold on each brew.</p>
        ) : (
          <Card className="mt-2">
            <TastingCompare labels={labels} stages={compareTastings(tastingRows)} />
          </Card>
        )}
      </div>
      <div>
        <SectionHeader>Notes</SectionHeader>
        {notes.length === 0 ? (
          <p className="mt-2 text-sm text-ink2">No notes on any brew.</p>
        ) : (
          <Card className="mt-2">
            <CompareFieldTable rows={notes} labels={labels} />
          </Card>
        )}
      </div>
    </div>
  );
}
