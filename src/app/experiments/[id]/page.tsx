import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth";
import { getExperiment } from "@/lib/db/queries";
import { deleteExperiment, updateExperiment } from "@/app/actions";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";
import { DeleteButton } from "@/components/delete-button";
import { experimentStatus } from "@/lib/domain/experiments";
import { describeDeletion } from "@/lib/domain/deletion";

export default async function ExperimentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect(loginUrl(`/experiments/${id}`));
  const exp = await getExperiment(id).catch(() => null);
  if (!exp) notFound();
  const brew = Array.isArray(exp.brews) ? exp.brews[0] : exp.brews;
  const coffeeName = brew && (Array.isArray(brew.coffees) ? brew.coffees[0]?.name : brew.coffees?.name);
  const update = updateExperiment.bind(null, id);
  const remove = deleteExperiment.bind(null, id, brew?.id ?? null);
  const del = describeDeletion("experiment", {});
  const fields: { key: string; label: string; multiline: boolean; value: string | null }[] = [
    { key: "hypothesis", label: "Hypothesis", multiline: true, value: exp.hypothesis },
    { key: "changedVariables", label: "Changed variables", multiline: false, value: exp.changed_variables },
    { key: "expectedResult", label: "Expected result", multiline: true, value: exp.expected_result },
    { key: "actualResult", label: "Actual result", multiline: true, value: exp.actual_result },
    { key: "conclusion", label: "Conclusion", multiline: true, value: exp.conclusion },
    { key: "nextQuestion", label: "Next question", multiline: false, value: exp.next_question },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-ink2">
          Experiment · {experimentStatus(exp) === "answered" ? "answered" : "open"}
          {brew ? ` · brew ${brew.dose_g}g / ${brew.water_g}g` : ""}
        </p>
        <h1 className="font-display text-2xl">
          {exp.hypothesis ? String(exp.hypothesis).slice(0, 80) : "Untitled experiment"}
        </h1>
        <p className="mt-1 text-sm text-ink2">
          {brew ? (
            <>
              Related brew:{" "}
              <Link href={`/brews/${brew.id}`} className="font-medium text-ember underline">
                {coffeeName ?? "Brew"}
              </Link>
            </>
          ) : (
            "No linked brew"
          )}
        </p>
      </div>
      <Card>
        <form action={update} className="flex flex-col gap-3">
          <input type="hidden" name="brewId" value={brew?.id ?? ""} />
          {fields.map((f) =>
            f.multiline ? (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Textarea name={f.key} rows={2} defaultValue={f.value ?? ""} />
              </div>
            ) : (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input name={f.key} defaultValue={f.value ?? ""} />
              </div>
            ),
          )}
          <Button>Save experiment</Button>
        </form>
      </Card>
      <DeleteButton
        label="Delete experiment"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
