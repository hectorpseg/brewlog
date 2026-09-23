import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listBrews } from "@/lib/db/queries";
import { BrewList } from "@/components/brew-list";
import { Card } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";

export default async function BrewsPage({ searchParams }: { searchParams: Promise<{ coffee?: string }> }) {
  await requireUser("/brews");
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
          title="No brews yet."
          body="Log your first brew to start building your brew history."
          actionHref="/brews/new"
          actionLabel="+ Brew"
        />
      ) : (
        <BrewList brews={brews} />
      )}
      {brews !== null && brews.length >= 2 ? (
        <Link href={`/brews/compare?a=${brews[0].id}&b=${brews[1].id}`} className="mt-4 inline-block min-h-11 px-2 py-2 text-sm font-medium text-ember underline">
          Compare brews
        </Link>
      ) : null}
    </div>
  );
}
