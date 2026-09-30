import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getSession, listBrewCandidates, listSessionBrews, recordRecentView } from "@/lib/db/queries";
import { excludeSessionBrews, formatCandidateLabel, type CandidateRow } from "@/lib/domain/sessions";
import { deleteSession, moveBrewToSession, removeBrewFromSession, updateSession } from "@/app/actions";
import { Button, Card, Label, SectionHeader, Select } from "@/components/ui/controls";
import { DeleteButton } from "@/components/delete-button";
import { SessionForm } from "@/components/session-form";
import { BackLink } from "@/components/back-link";
import { BrewCard } from "@/components/brew-card";
import { EmptyState } from "@/components/states";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

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
  const t = await getT();
  await requireUser(`/sessions/${id}`);
  const session = await getSession(id).catch(() => null);
  if (!session) notFound();
  // member brews (full rows for cards) + slim candidate rows for the dropdown —
  // candidates no longer reload the 50-row full join with observations.
  const [brews, allBrews] = await Promise.all([
    listSessionBrews(id).catch(() => [] as BrewRow[]),
    listBrewCandidates().catch(() => [] as CandidateRow[]),
    recordRecentView("session", id),
  ]);
  const update = updateSession.bind(null, id);
  const candidates = excludeSessionBrews(allBrews as CandidateRow[], id);
  // Deletion copy composed from pluralized fragments (no interpolation layer);
  // "No session" brews survive unassigned.
  const plural = (n: number, one: TranslationKey, many: TranslationKey) =>
    n === 1 ? `${n} ${t(one)}` : `${n} ${t(many)}`;
  const del = {
    title: t("delete.session.title"),
    confirm: t("session.delete"),
    body: `${plural(brews.length, "session.brewsOne", "session.brewsMany")} ${t("delete.session.tail")}`,
  };
  const remove = deleteSession.bind(null, id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/sessions" label={t("nav.sessions")} />
        <h1 className="font-display text-2xl leading-snug text-ink">{session.title}</h1>
        {session.notes ? <p className="mt-1 text-xs text-ink2">{session.notes}</p> : null}
      </div>
      <SessionForm action={update} session={session} submitLabel={t("session.save")} idPrefix={`session-${id}`} />
      <div>
        <SectionHeader>{t("session.brews")} ({brews.length})</SectionHeader>
        {brews.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title={t("session.brewsEmpty.title")}
              body={t("session.brewsEmpty.body")}
              actionHref="/brews/new"
              actionLabel={t("session.brewsEmpty.action")}
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
                        label={t("session.remove.label")}
                        title={t("session.remove.title")}
                        body={t("session.remove.body")}
                        confirmLabel={t("session.remove.confirm")}
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
          <SectionHeader>{t("session.addExisting")}</SectionHeader>
          <Card className="mt-2">
            <form action={moveBrewToSession} className="flex flex-col gap-3">
              <input type="hidden" name="sessionId" value={id} />
              <div>
                <Label htmlFor="add-brew">{t("session.field.brew")}</Label>
                <Select id="add-brew" name="brewId" defaultValue="">
                  <option value="">{t("session.pickBrew")}</option>
                  {candidates.map((b) => (
                    <option key={b.id} value={b.id}>
                      {formatCandidateLabel(b, t)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button>{t("session.addToSession")}</Button>
            </form>
          </Card>
        </div>
      ) : null}
      <DeleteButton
        label={t("session.delete")}
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
