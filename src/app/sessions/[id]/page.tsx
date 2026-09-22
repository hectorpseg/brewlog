import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getSession, listBrewCandidates, listSessionBrews } from "@/lib/db/queries";
import { excludeSessionBrews, formatCandidateLabel, type CandidateRow } from "@/lib/domain/sessions";
import { deleteSession, moveBrewToSession, removeBrewFromSession, updateSession } from "@/app/actions";
import { Button, Card, Label, SectionHeader, Select } from "@/components/ui/controls";
import { DeleteButton } from "@/components/delete-button";
import { SessionEditor } from "@/components/session-editor";
import { BackLink } from "@/components/back-link";
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
  await requireUser(`/sessions/${id}`);
  const session = await getSession(id).catch(() => null);
  if (!session) notFound();
  // member brews (full rows for cards) + slim candidate rows for the dropdown —
  // candidates no longer reload the 50-row full join with observations.
  const [brews, allBrews] = await Promise.all([
    listSessionBrews(id).catch(() => [] as BrewRow[]),
    listBrewCandidates().catch(() => [] as CandidateRow[]),
  ]);
  const update = updateSession.bind(null, id);
  const candidates = excludeSessionBrews(allBrews as CandidateRow[], id);
  const del = describeDeletion("session", { brews: brews.length });
  const remove = deleteSession.bind(null, id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/sessions" label="Sessions" />
        <h1 className="font-display text-2xl">{session.title}</h1>
        {session.notes ? <p className="mt-1 text-sm text-ink2">{session.notes}</p> : null}
        <SessionEditor session={session} update={update} />
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
                    <div className="mt-1 flex justify-end">
                      <DeleteButton
                        label="Remove from session"
                        title="Remove this brew from the session?"
                        body="The brew itself stays in history."
                        confirmLabel="Remove"
                        action={removeBrewFromSession.bind(null, b.id, `/sessions/${id}`)}
                      />
                    </div>
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
                      {formatCandidateLabel(b)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button>Add to session</Button>
            </form>
          </Card>
        </div>
      ) : null}
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
