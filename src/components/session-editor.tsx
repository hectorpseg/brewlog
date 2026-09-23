import { Button, Card, Input, Label, Textarea } from "./ui/controls";

// The detail screen is the form: fields inline, no edit gate. Destructive
// action stays at the bottom of the page.
export function SessionEditor({ session, update }: {
  session: { title: string; notes: string | null };
  update: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card className="mt-3">
      <form action={update} className="flex flex-col gap-3">
        <div><Label>Title</Label><Input name="title" defaultValue={session.title} required maxLength={120} /></div>
        <div><Label>Notes</Label><Textarea name="notes" rows={2} defaultValue={session.notes ?? ""} /></div>
        <div>
          <Button>Save session</Button>
        </div>
      </form>
    </Card>
  );
}
