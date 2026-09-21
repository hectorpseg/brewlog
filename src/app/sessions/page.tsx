import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth";
import { listSessions } from "@/lib/db/queries";
import { createSession } from "@/app/actions";
import { Button, Card, Input, Label, SectionHeader, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/states";
import Link from "next/link";

export default async function SessionsPage() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect(loginUrl("/sessions"));
  const sessions = await listSessions().catch(() => null);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Sessions</h1>
      <Card>
        <form action={createSession} className="flex flex-col gap-3">
          <div><Label>Title *</Label><Input name="title" required maxLength={120} placeholder="e.g. Phase 1 Origami exploration" /></div>
          <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
          <Button>Save session</Button>
        </form>
      </Card>
      <div>
        <SectionHeader>Past sessions</SectionHeader>
        {sessions === null ? (
          <Card><p className="text-sm">Supabase is not reachable. Check your connection, then reload.</p></Card>
        ) : sessions.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No sessions yet"
              body="Group related brews — a cupping, an exploration phase, a filter test."
              actionHref="/brews"
              actionLabel="Go to brews"
            />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {sessions.map((s: { id: string; title: string; notes: string | null }) => (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`}>
                  <Card>
                    <div className="font-medium">{s.title}</div>
                    {s.notes ? <div className="mt-0.5 text-sm text-ink2">{s.notes}</div> : null}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
