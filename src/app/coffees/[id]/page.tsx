import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth";
import { getCoffee, listBrews } from "@/lib/db/queries";
import { deleteCoffee, updateCoffee } from "@/app/actions";
import { Button, Card, Input, Label, SectionHeader } from "@/components/ui/controls";
import { DeleteButton } from "@/components/delete-button";
import { BrewCard } from "@/components/brew-card";
import { EmptyState } from "@/components/states";
import { describeDeletion } from "@/lib/domain/deletion";

export default async function CoffeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect(loginUrl(`/coffees/${id}`));
  const coffee = await getCoffee(id).catch(() => null);
  if (!coffee) notFound();
  const brews = await listBrews(id).catch(() => []);
  const update = updateCoffee.bind(null, id);
  const noted = brews.filter((b: { observations?: unknown }) => {
    const o = b.observations;
    return Array.isArray(o) ? o.length > 0 : o != null;
  }).length;
  const del = describeDeletion("coffee", { brews: brews.length, observations: noted });
  const remove = deleteCoffee.bind(null, id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">{coffee.name}</h1>
        <p className="tnum mt-1 text-sm text-ink2">
          {[coffee.origin, coffee.process].filter(Boolean).join(" · ") || "origin/process unknown"}
          {" · "}~{coffee.remaining_weight_g ?? "?"} g remaining
        </p>
      </div>
      {brews.length > 0 ? (
        <Link
          href={`/brews/new?coffee=${id}&copy=1`}
          className="min-h-11 rounded-[10px] bg-ember px-4 py-2 text-center font-medium text-white"
        >
          Copy last brew
        </Link>
      ) : (
        <Link
          href={`/brews/new?coffee=${id}`}
          className="min-h-11 rounded-[10px] bg-ember px-4 py-2 text-center font-medium text-white"
        >
          + First brew of this coffee
        </Link>
      )}
      <div>
        <SectionHeader>Brews ({brews.length})</SectionHeader>
        {brews.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No brews of this coffee"
              body="Start from the competition defaults and adjust from there."
              actionHref={`/brews/new?coffee=${id}`}
              actionLabel="+ Brew it"
            />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {brews.map((b: {
              id: string; dose_g: number; water_g: number; temp_c: number | null;
              grind_clicks: number | null; total_time_sec: number | null; filter: string | null;
            }) => (
              <li key={b.id}><BrewCard brew={b} showCoffee={false} /></li>
            ))}
          </ul>
        )}
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-ink2">Edit coffee</summary>
        <Card>
          <form action={update} className="flex flex-col gap-3">
            <div><Label>Name</Label><Input name="name" defaultValue={coffee.name} /></div>
            <div><Label>Remaining g</Label><Input name="remainingWeightG" type="number" inputMode="decimal" defaultValue={coffee.remaining_weight_g ?? ""} /></div>
            <div><Label>Received</Label><Input name="receivedDate" type="date" defaultValue={coffee.received_date ?? ""} /></div>
            <Button>Save coffee</Button>
          </form>
        </Card>
      </details>
      <DeleteButton
        label="Delete coffee"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
