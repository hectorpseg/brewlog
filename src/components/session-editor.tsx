import { Button, Card, Input, Label, Textarea } from "./ui/controls";

// The detail screen is the form: fields inline, no edit gate. Destructive
// action stays at the bottom of the page. Card + saved-button treatment
// mirrors CoffeeEditor; details/summary exists only in the long brew form.
export function SessionEditor({ session, update }: {
  session: { title: string; notes: string | null };
  update: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card>
      <form action={update} className="flex flex-col gap-3">
        <div><Label htmlFor="session-title">Title</Label><Input id="session-title" name="title" defaultValue={session.title} required maxLength={120} /></div>
        <div><Label htmlFor="session-notes">Notes</Label><Textarea id="session-notes" name="notes" rows={2} defaultValue={session.notes ?? ""} /></div>
        <div>
          <Button>Save session</Button>
        </div>
      </form>
    </Card>
  );
}
