import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listCoffees, latestBrew, latestBrewForCoffee, listSessionOptions, listPours, getBrew } from "@/lib/db/queries";
import { BrewForm } from "@/components/brew-form";
import { Card } from "@/components/ui/controls";
import { formatRatio } from "@/lib/domain/ratio";
import { actualWaterG, pouredTotalG } from "@/lib/domain/brew-water";
import { formInitKey } from "@/lib/domain/recipe-start";

import { getT } from "@/lib/i18n/server";

export default async function NewBrewPage({ searchParams }: { searchParams: Promise<{ coffee?: string; copy?: string; brew?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  const here = `/brews/new${sp.brew ? `?brew=${encodeURIComponent(sp.brew)}&copy=1` : sp.coffee ? `?coffee=${encodeURIComponent(sp.coffee)}${sp.copy ? "&copy=1" : ""}` : ""}`;
  const user = await requireUser(here);
  // fetch-once reference data: stable for the session, never refetched on keystroke
  const [coffees, sessions] = await Promise.all([
    listCoffees().catch(() => []),
    listSessionOptions().catch(() => []),
  ]);
  // "New from this" carries a specific brew ID; coffee-level "Brew again" uses
  // the latest brew for that coffee. Both honor the existing copy rules.
  const copyFrom = sp.brew
    ? await getBrew(sp.brew).catch(() => null)
    : sp.copy === "1" && sp.coffee
      ? await latestBrewForCoffee(sp.coffee).catch(() => null)
      : null;
  // structured pours are recipe: fetched only for the copy source, so Brew
  // Again / Continue inherit them. A fresh brew never invents pours.
  const copyPours = copyFrom ? await listPours(copyFrom.id).catch(() => []) : null;
  // +Brew continues the workflow: the most recent brew is offered as an
  // explicit copy source — starting fresh stays one tap away. A fresh form
  // never preselects a coffee: that choice belongs to the user.
  const last = !sp.coffee && !sp.brew ? await latestBrew().catch(() => null) : null;
  const lastCoffees = last?.coffees as { name?: string } | { name?: string }[] | null | undefined;
  const lastCoffeeName = Array.isArray(lastCoffees) ? lastCoffees[0]?.name : lastCoffees?.name;
  // teaser ratio reflects actual brew water (poured total when pours exist)
  const lastPours = (last?.pours ?? null) as { amount_g?: unknown }[] | null;
  const lastActual = actualWaterG(last?.water_g, pouredTotalG(lastPours));
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl">{t("brew.new.title")}</h1>
      {last && lastCoffeeName ? (
        <Card className="mb-3">
          <p className="text-sm text-ink2">
            {t("brew.last")} · {lastCoffeeName} ·{" "}
            {formatRatio(Number(last.dose_g), lastActual ?? NaN)}
          </p>
          <Link
            href={`/brews/new?coffee=${last.coffee_id}&copy=1`}
            className="mt-2 inline-block min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white transition-transform duration-150 active:scale-[0.95]"
          >
            {t("brew.continueLast")}
          </Link>
        </Card>
      ) : null}
      <BrewForm
        key={formInitKey(copyFrom?.id as string | undefined, sp.coffee)}
        userId={user.id}
        coffees={coffees.map((c: {
          id: string; name: string; origin: string | null; process: string | null;
          remaining_weight_g: number | null; received_date: string | null;
        }) => ({
          id: c.id, name: c.name, origin: c.origin, process: c.process,
          remaining_weight_g: c.remaining_weight_g, received_date: c.received_date,
        }))}
        sessions={sessions.map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }))}
        initialCoffeeId={sp.coffee ?? (copyFrom?.coffee_id as string | undefined) ?? undefined}
        recipeFrom={copyFrom}
        recipePoursFrom={copyPours}
      />
    </div>
  );
}
