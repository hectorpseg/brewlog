import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { listExperiments } from "@/lib/db/queries";
import { EntityCard } from "@/components/entity-card";
import { Card, SectionHeader } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";
import { EXPERIMENT_STATUS_LABEL, experimentTitle, isExperimentStatus } from "@/lib/domain/experiments";

export default async function ExperimentsPage() {
  await requireUser("/experiments");
  const experiments = await listExperiments().catch(() => null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Experiments</h1>
        <Link href="/experiments/new" className="min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white">
          + Experiment
        </Link>
      </div>
      <div>
        <SectionHeader>All experiments</SectionHeader>
        {experiments === null ? (
          <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
        ) : experiments.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No experiments yet."
              body="Turn a brewing question into a test, then link the brews you use to answer it."
              actionHref="/experiments/new"
              actionLabel="Create experiment"
            />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {experiments.map((e: {
              id: string; title?: string | null; hypothesis?: string | null;
              status?: string | null; updated_at?: string; brewCount: number;
            }) => (
              <li key={e.id}>
                <EntityCard href={`/experiments/${e.id}`} label={experimentTitle(e)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{experimentTitle(e)}</div>
                    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink2">
                      {isExperimentStatus(e.status) ? EXPERIMENT_STATUS_LABEL[e.status] : "planned"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-ink2">
                    {e.brewCount} {e.brewCount === 1 ? "brew" : "brews"}
                  </div>
                </EntityCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
