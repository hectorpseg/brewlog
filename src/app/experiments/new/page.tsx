import { requireUser } from "@/lib/supabase/require-user";
import { createExperiment } from "@/app/actions";
import { BackLink } from "@/components/back-link";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui/controls";

export default async function NewExperimentPage() {
  await requireUser("/experiments/new");
  return (
    <div>
      <BackLink href="/experiments" label="Experiments" />
      <h1 className="mb-3 font-display text-2xl">New experiment</h1>
      <Card>
        <form action={createExperiment} className="flex flex-col gap-3">
          <div><Label>Title *</Label><Input name="title" required maxLength={120} placeholder="e.g. Dialing in Origami pulse pattern" /></div>
          <div>
            <Label htmlFor="exp-status">Status</Label>
            <Select id="exp-status" name="status" defaultValue="planned">
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="evaluated">Evaluated</option>
            </Select>
          </div>
          <div><Label>Hypothesis</Label><Textarea name="hypothesis" rows={2} placeholder="What do you expect to learn?" /></div>
          <div><Label>Variables (prefer one)</Label><Input name="changedVariables" maxLength={1000} placeholder="e.g. grind 70 → 68" /></div>
          <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
          <div><Label>Conclusion</Label><Textarea name="conclusion" rows={2} placeholder="Leave empty until evaluated." /></div>
          <Button>Save experiment</Button>
        </form>
      </Card>
    </div>
  );
}
