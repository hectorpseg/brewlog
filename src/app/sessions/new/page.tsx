import { requireUser } from "@/lib/supabase/require-user";
import { createSession } from "@/app/actions";
import { BackLink } from "@/components/back-link";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";

export default async function NewSessionPage() {
  await requireUser("/sessions/new");
  return (
    <div>
      <BackLink href="/sessions" label="Sessions" />
      <h1 className="mb-3 font-display text-2xl">New session</h1>
      <Card>
        <form action={createSession} className="flex flex-col gap-3">
          <div><Label>Title *</Label><Input name="title" required maxLength={120} placeholder="e.g. Phase 1 Origami exploration" /></div>
          <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
          <Button>Save session</Button>
        </form>
      </Card>
    </div>
  );
}
