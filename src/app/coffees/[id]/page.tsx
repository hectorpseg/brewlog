import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoffee, listBrews } from "@/lib/db/queries";
import { updateCoffee } from "@/app/actions";
import { Button, Card, Input, Label } from "@/components/ui/controls";
import { formatRatio } from "@/lib/domain/ratio";

export default async function CoffeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const coffee = await getCoffee(id).catch(() => null);
  if (!coffee) notFound();
  const brews = await listBrews(id).catch(() => []);
  const update = updateCoffee.bind(null, id);
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">{coffee.name}</h1>
      <Card>
        <div className="text-sm text-zinc-600">
          {[coffee.origin, coffee.process].filter(Boolean).join(" · ") || "origin/process unknown"}
        </div>
        <div className="text-sm">~{coffee.remaining_weight_g ?? "?"} g remaining</div>
        <Link href={`/brews/new?coffee=${id}`} className="mt-2 inline-block min-h-11 rounded-xl bg-zinc-900 px-4 py-2 text-white">+ Brew this coffee</Link>
      </Card>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Edit coffee</summary>
        <Card>
          <form action={update} className="flex flex-col gap-3">
            <div><Label>Name</Label><Input name="name" defaultValue={coffee.name} /></div>
            <div><Label>Remaining g</Label><Input name="remainingWeightG" type="number" inputMode="decimal" defaultValue={coffee.remaining_weight_g ?? ""} /></div>
            <Button>Save</Button>
          </form>
        </Card>
      </details>
      <h2 className="mt-2 font-medium">Brews ({brews.length})</h2>
      <ul className="flex flex-col gap-2">
        {brews.map((b: { id: string; dose_g: number; water_g: number; temp_c: number | null; grind_clicks: number | null }) => (
          <li key={b.id}>
            <Link href={`/brews/${b.id}`}>
              <Card>
                <span className="text-sm">{b.dose_g}g / {b.water_g}g · {formatRatio(Number(b.dose_g), Number(b.water_g))} · {b.temp_c ?? "?"}C · {b.grind_clicks ?? "?"} clicks</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
