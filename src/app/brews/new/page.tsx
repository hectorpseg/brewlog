import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listCoffees, latestBrew, latestBrewForCoffee, listSessionOptions, getCompetitionSettings } from "@/lib/db/queries";
import { DEFAULT_MIN_BEVERAGE_G } from "@/lib/validation/schemas";
import { BrewForm } from "@/components/brew-form";
import { Card } from "@/components/ui/controls";
import { formatRatio } from "@/lib/domain/ratio";

export default async function NewBrewPage({ searchParams }: { searchParams: Promise<{ coffee?: string; copy?: string }> }) {
  const sp = await searchParams;
  const here = `/brews/new${sp.coffee ? `?coffee=${encodeURIComponent(sp.coffee)}${sp.copy ? "&copy=1" : ""}` : ""}`;
  const user = await requireUser(here);
  // fetch-once reference data: stable for the session, never refetched on keystroke
  const [coffees, sessions, settings] = await Promise.all([
    listCoffees().catch(() => []),
    listSessionOptions().catch(() => []),
    getCompetitionSettings().catch(() => null),
  ]);
  const copyFrom = sp.copy === "1" && sp.coffee ? await latestBrewForCoffee(sp.coffee).catch(() => null) : null;
  // +Brew continues the workflow: the most recent brew is offered as an
  // explicit copy source — starting fresh stays one tap away. A fresh form
  // never preselects a coffee: that choice belongs to the user.
  const last = !sp.coffee ? await latestBrew().catch(() => null) : null;
  const lastCoffees = last?.coffees as { name?: string } | { name?: string }[] | null | undefined;
  const lastCoffeeName = Array.isArray(lastCoffees) ? lastCoffees[0]?.name : lastCoffees?.name;
  return (
    <div>
      <h1 className="mb-3 font-display text-2xl">New brew</h1>
      {last && lastCoffeeName ? (
        <Card className="mb-3">
          <p className="text-sm text-ink2">
            Last brew · {lastCoffeeName} ·{" "}
            {formatRatio(Number(last.dose_g), Number(last.water_g))}
          </p>
          <Link
            href={`/brews/new?coffee=${last.coffee_id}&copy=1`}
            className="mt-2 inline-block min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white"
          >
            Continue from last brew
          </Link>
        </Card>
      ) : null}
      <BrewForm
        userId={user.id}
        coffees={coffees.map((c: {
          id: string; name: string; origin: string | null; process: string | null;
          remaining_weight_g: number | null; received_date: string | null;
        }) => ({
          id: c.id, name: c.name, origin: c.origin, process: c.process,
          remaining_weight_g: c.remaining_weight_g, received_date: c.received_date,
        }))}
        sessions={sessions.map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }))}
        minBeverageG={settings?.min_final_beverage_g != null ? Number(settings.min_final_beverage_g) : DEFAULT_MIN_BEVERAGE_G}
        initialCoffeeId={sp.coffee ?? undefined}
        recipeFrom={copyFrom}
      />
    </div>
  );
}
