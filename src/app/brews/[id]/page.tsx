import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getBrew, listExperimentsForBrew, listSessionOptions, listTastings } from "@/lib/db/queries";
import { createExperiment, deleteBrew } from "@/app/actions";
import { BrewEditor } from "@/components/brew-editor";
import { BackLink } from "@/components/back-link";
import { DeleteButton } from "@/components/delete-button";
import { Button, Card, Input, Label, SectionHeader, Textarea } from "@/components/ui/controls";
import { formatRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { brewLifecycle, brewWarnings, BREW_LIFECYCLE_LABEL } from "@/lib/domain/brew-status";
import { describeDeletion } from "@/lib/domain/deletion";
import { experimentStatus } from "@/lib/domain/experiments";

export default async function BrewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/brews/${id}`);
  const brew = await getBrew(id).catch(() => null);
  if (!brew) notFound();
  // independent reads, one round trip instead of two sequential ones
  const [sessions, experiments, tastings] = await Promise.all([
    listSessionOptions().catch(() => []),
    listExperimentsForBrew(id).catch(() => []),
    listTastings(id).catch(() => []),
  ]);
  const obs = Array.isArray(brew.observations) ? brew.observations[0] ?? null : brew.observations ?? null;
  const coffeeName = Array.isArray(brew.coffees) ? brew.coffees[0]?.name : brew.coffees?.name;
  const brewSession = Array.isArray(brew.sessions) ? brew.sessions[0] : brew.sessions;
  const status = brewLifecycle(brew, obs);
  const warnings = brewWarnings(brew);
  const del = describeDeletion("brew", {
    observations: obs ? 1 : 0,
    tastings: tastings.length,
    experiments: experiments.length,
  });
  const remove = deleteBrew.bind(null, id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/brews" label="Brews" />
        <p className="text-sm text-ink2">{coffeeName ?? "Brew"}</p>
        <h1 className="tnum font-display text-4xl leading-none">
          {formatRatio(Number(brew.dose_g), Number(brew.water_g))}
        </h1>
        <p className="tnum mt-1 text-sm text-ink2">
          Brewed {formatBrewDate(brew.brewed_at ?? brew.created_at)} · {brew.dose_g} g / {brew.water_g} g · {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} clicks
          {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
          {brew.final_beverage_g ? ` · → ${brew.final_beverage_g} g` : ""}
        </p>
        <p className="mt-1 text-sm text-ink2">
          {BREW_LIFECYCLE_LABEL[status]}
          {warnings.length > 0 ? ` · ${warnings.join(" · ")}` : ""}
        </p>
        <p className="mt-1 text-sm text-ink2">
          Session ·{" "}
          {brewSession ? (
            <Link href={`/sessions/${brewSession.id}`} className="font-medium text-ember underline">
              {brewSession.title}
            </Link>
          ) : (
            "None"
          )}
        </p>
      </div>
      <div>
        <SectionHeader>Recipe</SectionHeader>
        <div className="mt-2">
          <BrewEditor
        userId={user.id}
        brew={brew}
        observation={obs}
        tastings={tastings}
        sessions={sessions.map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }))}
      />
        </div>
      </div>
      <div>
        <SectionHeader>Experiments ({experiments.length})</SectionHeader>
        {experiments.length === 0 ? (
          <p className="mt-1 text-sm text-ink2">
            No experiments yet. Turn a brewing question into a test and connect the brews you use to answer it.
          </p>
        ) : null}
        {experiments.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {experiments.map((e: {
              id: string; hypothesis: string | null; conclusion: string | null;
              actual_result: string | null; next_question: string | null;
            }) => (
              <li key={e.id}>
                <Link href={`/experiments/${e.id}`}>
                  <Card>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">
                        {e.hypothesis ? String(e.hypothesis).slice(0, 90) : "Untitled experiment"}
                      </div>
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink2">
                        {experimentStatus(e)}
                      </span>
                    </div>
                    {e.next_question ? (
                      <div className="mt-0.5 text-sm text-ink2">Next: {e.next_question}</div>
                    ) : null}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-ink2">
            {experiments.length > 0 ? "New experiment" : "Experiment (hypothesis → conclusion)"}
          </summary>
          <Card className="mt-2">
          <form action={createExperiment} className="flex flex-col gap-3">
            <input type="hidden" name="brewId" value={brew.id} />
            <div><Label>Hypothesis</Label><Textarea name="hypothesis" rows={2} /></div>
            <div><Label>Changed variables (prefer one)</Label><Input name="changedVariables" placeholder="e.g. grind 70 → 68" /></div>
            <div><Label>Expected result</Label><Textarea name="expectedResult" rows={2} /></div>
            <div><Label>Actual result</Label><Textarea name="actualResult" rows={2} /></div>
            <div><Label>Conclusion</Label><Textarea name="conclusion" rows={2} /></div>
            <div><Label>Next question</Label><Input name="nextQuestion" /></div>
            <Button>Save experiment</Button>
          </form>
        </Card>
      </details>
      </div>
      <Link
        href={`/brews/new?coffee=${brew.coffee_id}&copy=1`}
        className="min-h-11 rounded-[10px] bg-ember px-4 py-2 text-center font-medium text-white"
      >
        Copy as next brew
      </Link>
      <DeleteButton
        label="Delete brew"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
