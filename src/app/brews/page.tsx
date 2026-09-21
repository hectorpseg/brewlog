import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth";
import { listBrews } from "@/lib/db/queries";
import { BrewCard } from "@/components/brew-card";
import { Card } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";

export default async function BrewsPage({ searchParams }: { searchParams: Promise<{ coffee?: string }> }) {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect(loginUrl("/brews"));
  const sp = await searchParams;
  const brews = await listBrews(sp.coffee).catch(() => null);
  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl">Brews</h1>
      </div>
      {brews === null ? (
        <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
      ) : brews.length === 0 ? (
        <EmptyState
          title="No brews yet"
          body="Copy your last brew and change only what changed — that is the whole workflow."
          actionHref="/brews/new"
          actionLabel="+ Log first brew"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {brews.map((b: {
            id: string; dose_g: number; water_g: number; temp_c: number | null;
            grind_clicks: number | null; total_time_sec: number | null; filter: string | null;
          }) => (
            <li key={b.id}><BrewCard brew={b} /></li>
          ))}
        </ul>
      )}
      {brews !== null && brews.length >= 2 ? (
        <Link href={`/brews/compare?a=${brews[0].id}&b=${brews[1].id}`} className="mt-4 inline-block min-h-11 px-2 py-2 text-sm font-medium text-ember underline">
          Compare latest two
        </Link>
      ) : null}
    </div>
  );
}
