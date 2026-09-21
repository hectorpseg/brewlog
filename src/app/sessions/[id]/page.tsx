import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth";
import { getSession, listBrews, listSessionBrews } from "@/lib/db/queries";
import { deleteSession, moveBrewToSession, updateSession } from "@/app/actions";
import { Button, Card, Input, Label, SectionHeader, Select, Textarea } from "@/components/ui/controls";
import { DeleteButton } from "@/components/delete-button";
import { BrewCard } from "@/components/brew-card";
import { EmptyState } from "@/components/states";
import { describeDeletion } from "@/lib/domain/deletion";

type BrewRow = {
  id: string;
  dose_g: number;
  water_g: number;
  temp_c: number | null;
  grind_clicks: number | null;
  total_time_sec: number | null;
  filter: string | null;
  session_id: string | null;
};

export default async function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect(loginUrl(`/sessions/${id}`));
  const session = await getSession(id).catch(() => null);
  if (!session) notFound();
  const [brews, allBrews] = await Promise.all([
    listSessionBrews(id).catch(() => [] as BrewRow[]),
    listBrews().catch(() => [] as BrewRow[]),
  ]);
  const update = updateSession.bind(null, id);
  const candidates = (allBrews as BrewRow[]).filter((b) => b.session_id !== id);
  const del = describeDeletion("session", { brews: brews.length });
  const remove = deleteSession.bind(null, id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">{session.title}</h1>
        {session.notes ? <p className="mt-1 text-sm text-ink2">{session.notes}</p> : null}
      </div>
      <div>
        <SectionHeader>Brews ({brews.length})</SectionHeader>
        {brews.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No brews in this session"
              body="Add an existing brew below, or assign one from its brew page."
              actionHref="/brews/new"
              actionLabel="+ New brew"
            />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(brews as BrewRow[]).map((b) => (
              <li key={b.id}>
                <BrewCard
                  brew={b}
                  action={
                    <form action={moveBrewToSession} className="mt-1 flex justify-end">
                      <input type="hidden" name="brewId" value={b.id} />
                      <input type="hidden" name="sessionId" value="" />
                      <input type="hidden" name="returnTo" value={`/sessions/${id}`} />
                      <Button variant="ghost" className="px-3 py-1 text-sm">
                        Remove from session
                      </Button>
                    </form>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {candidates.length > 0 ? (
        <div>
          <SectionHeader>Add an existing brew</SectionHeader>
          <Card className="mt-2">
            <form action={moveBrewToSession} className="flex flex-col gap-3">
              <input type="hidden" name="sessionId" value={id} />
              <div>
                <Label htmlFor="add-brew">Brew</Label>
                <Select id="add-brew" name="brewId" defaultValue="">
                  <option value="">Pick a brew…</option>
                  {candidates.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.dose_g}g / {b.water_g}g · {b.temp_c ?? "?"}°C · {b.grind_clicks ?? "?"} clicks
                    </option>
                  ))}
                </Select>
              </div>
              <Button>Add to session</Button>
            </form>
          </Card>
        </div>
      ) : null}
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-ink2">Edit session</summary>
        <Card>
          <form action={update} className="flex flex-col gap-3">
            <div><Label>Title</Label><Input name="title" defaultValue={session.title} required maxLength={120} /></div>
            <div><Label>Notes</Label><Textarea name="notes" rows={2} defaultValue={session.notes ?? ""} /></div>
            <Button>Save session</Button>
          </form>
        </Card>
      </details>
      <DeleteButton
        label="Delete session"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
