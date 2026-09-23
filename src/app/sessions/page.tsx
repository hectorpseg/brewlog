import { requireUser } from "@/lib/supabase/require-user";
import { listSessions } from "@/lib/db/queries";
import { EntityCard } from "@/components/entity-card";
import { Card, SectionHeader } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";
import Link from "next/link";

export default async function SessionsPage() {
  await requireUser("/sessions");
  const sessions = await listSessions().catch(() => null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Sessions</h1>
        <Link href="/sessions/new" className="min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white">
          + Session
        </Link>
      </div>
      <div>
        <SectionHeader>Past sessions</SectionHeader>
        {sessions === null ? (
          <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
        ) : sessions.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No sessions yet."
              body="Use a session to group related experiments."
              actionHref="/sessions/new"
              actionLabel="Create session"
            />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {sessions.map((s: { id: string; title: string; notes: string | null }) => (
              <li key={s.id}>
                <EntityCard href={`/sessions/${s.id}`} label={s.title}>
                  <div className="font-medium">{s.title}</div>
                  {s.notes ? <div className="mt-0.5 text-sm text-ink2">{s.notes}</div> : null}
                </EntityCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
