import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listBrews, listCoffees } from "@/lib/db/queries";
import { Card } from "@/components/ui/controls";
import { formatRatio } from "@/lib/domain/ratio";

export default async function BrewsPage({ searchParams }: { searchParams: Promise<{ coffee?: string }> }) {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const sp = await searchParams;
  const [brews, coffees] = await Promise.all([
    listBrews(sp.coffee).catch(() => []),
    listCoffees().catch(() => []),
  ]);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Brews</h1>
        <Link href="/brews/new" className="min-h-11 rounded-xl bg-zinc-900 px-4 py-2 text-white">+ Brew</Link>
      </div>
      {brews.length === 0 ? (
        <Card><p className="text-sm text-zinc-600">No brews yet.</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {brews.map((b: { id: string; dose_g: number; water_g: number; temp_c: number | null; grind_clicks: number | null; total_time_sec: number | null }) => (
            <li key={b.id}>
              <Link href={`/brews/${b.id}`}>
                <Card>
                  <div className="text-sm font-medium">{b.dose_g}g / {b.water_g}g · {formatRatio(Number(b.dose_g), Number(b.water_g))}</div>
                  <div className="text-sm text-zinc-600">{b.temp_c ?? "?"}C · {b.grind_clicks ?? "?"} clicks{b.total_time_sec ? ` · ${b.total_time_sec}s` : ""}</div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {brews.length >= 2 ? (
        <Link href={`/brews/compare?a=${brews[0].id}&b=${brews[1].id}`} className="mt-3 inline-block min-h-11 px-2 py-2 text-sm underline">
          Compare latest two
        </Link>
      ) : null}
      <div className="hidden">{coffees.length}</div>
    </div>
  );
}
