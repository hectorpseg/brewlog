import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getExperiment, listBrewCandidates, listExperimentBrews } from "@/lib/db/queries";
import { deleteExperiment, linkBrewToExperiment, unlinkBrewFromExperiment, updateExperiment } from "@/app/actions";
import { Card, Input, Label, SectionHeader, Select, Textarea } from "@/components/ui/controls";
import { SaveButton } from "@/components/save-button";
import { DeleteButton } from "@/components/delete-button";
import { BackLink } from "@/components/back-link";
import { BackToTop } from "@/components/back-to-top";
import { BrewCard } from "@/components/brew-card";
import { Button } from "@/components/ui/controls";
import { CopySummaryButton } from "@/components/copy-summary";
import { EmptyState } from "@/components/states";
import {
  EXPERIMENT_STATUS_LABEL,
  experimentTitle,
  formatExperimentSummary,
  isExperimentStatus,
} from "@/lib/domain/experiments";
import { formatCandidateLabel } from "@/lib/domain/sessions";
import { describeDeletion } from "@/lib/domain/deletion";

export default async function ExperimentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/experiments/${id}`);
  const exp = await getExperiment(id).catch(() => null);
  if (!exp) notFound();
  const [brews, candidates] = await Promise.all([
    listExperimentBrews(id).catch(() => [] as { id: string }[]),
    listBrewCandidates().catch(() => [] as { id: string; dose_g: number; water_g: number; temp_c: number | null; grind_clicks: number | null }[]),
  ]);
  const linkedIds = new Set((brews as { id: string }[]).map((b) => b.id));
  const addable = (candidates as { id: string; dose_g: number; water_g: number; temp_c: number | null; grind_clicks: number | null }[])
    .filter((b) => !linkedIds.has(b.id));
  const update = updateExperiment.bind(null, id);
  const remove = deleteExperiment.bind(null, id, null);
  const del = describeDeletion("experiment", {});
  const title = experimentTitle(exp);
  const rawStatus: unknown = exp.status;
  const status = isExperimentStatus(rawStatus) ? rawStatus : "planned";
  const variables = exp.changed_variables ?? null;
  const summary = formatExperimentSummary({
    title: exp.title,
    status: EXPERIMENT_STATUS_LABEL[status],
    hypothesis: exp.hypothesis,
    changed_variables: variables,
    notes: exp.notes,
    conclusion: exp.conclusion,
    brews: brews as { dose_g?: unknown; water_g?: unknown; coffees?: { name?: unknown } | null }[],
  });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/experiments" label="Experiments" />
        <p className="text-sm text-ink2">
          Experiment · {EXPERIMENT_STATUS_LABEL[status]} · {brews.length} {brews.length === 1 ? "brew" : "brews"}
        </p>
        <h1 className="font-display text-2xl">{title}</h1>
        <div className="mt-1">
          <CopySummaryButton text={summary} />
        </div>
      </div>

      <div>
        <SectionHeader>Question</SectionHeader>
        <Card className="mt-2">
          {exp.hypothesis ? <p className="text-sm">{exp.hypothesis}</p> : <p className="text-sm text-ink2">No hypothesis recorded.</p>}
          {variables ? <p className="mt-2 text-sm text-ink2">Variables: {variables}</p> : null}
          {exp.expected_result ? <p className="mt-1 text-sm text-ink2">Expected: {exp.expected_result}</p> : null}
        </Card>
      </div>

      <div>
        <SectionHeader>Brews ({brews.length})</SectionHeader>
        {brews.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No linked brews"
              body="Link the brews you used to test this question. Linking never changes the brew itself."
              actionHref="/brews/new"
              actionLabel="+ New brew"
            />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(brews as React.ComponentProps<typeof BrewCard>["brew"][]).map((b) => (
              <li key={b.id}>
                <BrewCard
                  brew={b}
                  action={
                    <div className="mt-1 flex justify-end">
                      <DeleteButton
                        label="Unlink brew"
                        title="Unlink this brew from the experiment?"
                        body="The brew itself stays in history."
                        confirmLabel="Unlink"
                        action={unlinkBrewFromExperiment.bind(null, id, b.id)}
                      />
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {addable.length > 0 ? (
          <Card className="mt-2">
            <form action={linkBrewToExperiment} className="flex flex-col gap-3">
              <input type="hidden" name="experimentId" value={id} />
              <input type="hidden" name="returnTo" value={`/experiments/${id}`} />
              <div>
                <Label htmlFor="add-brew">Add a brew</Label>
                <Select id="add-brew" name="brewId" defaultValue="">
                  <option value="">Pick a brew…</option>
                  {addable.map((b) => (
                    <option key={b.id} value={b.id}>
                      {formatCandidateLabel(b)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button>Link brew</Button>
            </form>
          </Card>
        ) : null}
      </div>

      {(exp.notes || exp.actual_result || exp.conclusion || exp.next_question) ? (
        <div>
          <SectionHeader>Notes and conclusion</SectionHeader>
          <Card className="mt-2">
            {exp.notes ? <p className="text-sm">{exp.notes}</p> : null}
            {exp.actual_result ? <p className="mt-2 text-sm text-ink2">Observed: {exp.actual_result}</p> : null}
            {exp.conclusion ? <p className="mt-2 text-sm">Conclusion: {exp.conclusion}</p> : null}
            {exp.next_question ? <p className="mt-1 text-sm text-ink2">Next: {exp.next_question}</p> : null}
          </Card>
        </div>
      ) : null}

      <div>
        <SectionHeader>Edit experiment</SectionHeader>
        <Card className="mt-2">
          <form action={update} className="flex flex-col gap-3">
            <input type="hidden" name="returnTo" value={`/experiments/${id}`} />
            <div><Label>Title</Label><Input name="title" maxLength={120} defaultValue={exp.title ?? ""} placeholder="e.g. Dialing in Origami pulse pattern" /></div>
            <div>
              <Label htmlFor="exp-status">Status</Label>
              <Select id="exp-status" name="status" defaultValue={status}>
                <option value="planned">Planned</option>
                <option value="in_progress">In progress</option>
                <option value="evaluated">Evaluated</option>
              </Select>
            </div>
            <div><Label>Hypothesis</Label><Textarea name="hypothesis" rows={2} defaultValue={exp.hypothesis ?? ""} /></div>
            <div><Label>Variables (prefer one)</Label><Input name="changedVariables" defaultValue={variables ?? ""} /></div>
            <div><Label>Notes</Label><Textarea name="notes" rows={2} defaultValue={exp.notes ?? ""} /></div>
            <div><Label>Conclusion</Label><Textarea name="conclusion" rows={2} defaultValue={exp.conclusion ?? ""} placeholder="Leave empty until evaluated." /></div>
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-ink2">
                Older fields (expected, observed, next question)
              </summary>
              <div className="flex flex-col gap-3">
                <div><Label>Expected result</Label><Textarea name="expectedResult" rows={2} defaultValue={exp.expected_result ?? ""} /></div>
                <div><Label>Actual result</Label><Textarea name="actualResult" rows={2} defaultValue={exp.actual_result ?? ""} /></div>
                <div><Label>Next question</Label><Input name="nextQuestion" defaultValue={exp.next_question ?? ""} /></div>
              </div>
            </details>
            <SaveButton label="Save experiment" savingLabel="Saving experiment…" />
          </form>
        </Card>
      </div>

      <p className="text-sm text-ink2">
        Related brews stay in history either way. Deleting removes only this experiment and its links.
      </p>
      <DeleteButton
        label="Delete experiment"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
      <BackToTop />
    </div>
  );
}
