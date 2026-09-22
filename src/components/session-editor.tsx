"use client";
import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "./ui/controls";

// Same interaction model as CoffeeEditor: explicit Edit action near the
// title, form revealed inline below it, destructive action stays at the
// bottom of the page. No collapsible "Edit session" section.
export function SessionEditor({ session, update }: {
  session: { title: string; notes: string | null };
  update: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div>
      <div className="mt-3">
        <Button variant="ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </div>
      {editing ? (
        <Card className="mt-3">
          <form action={update} className="flex flex-col gap-3">
            <div><Label>Title</Label><Input name="title" defaultValue={session.title} required maxLength={120} /></div>
            <div><Label>Notes</Label><Textarea name="notes" rows={2} defaultValue={session.notes ?? ""} /></div>
            <div className="flex gap-2">
              <Button>Save session</Button>
              <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
