import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBrew } from "@/lib/db/queries";
import { createExperiment } from "@/app/actions";
import { BrewEditor } from "@/components/brew-editor";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";
import { formatRatio } from "@/lib/domain/ratio";

export default async function BrewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const brew = await getBrew(id).catch(() => null);
  if (!brew) notFound();
  const obs = Array.isArray(brew.observations) ? brew.observations[0] ?? null : brew.observations ?? null;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">
        {brew.dose_g}g / {brew.water_g}g · {formatRatio(Number(brew.dose_g), Number(brew.water_g))}
      </h1>
      <BrewEditor userId={data.user.id} brew={brew} observation={obs} />
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Experiment (hypothesis → conclusion)</summary>
        <Card>
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
      <Link href={`/brews/new?coffee=${brew.coffee_id}&copy=1`} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-center">
        Copy as next brew
      </Link>
    </div>
  );
}
