"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Label } from "./ui/controls";

// Owns the coffee action row AND the edit form below it, so opening edit mode
// never distorts the primary Brew action. Structure when editing:
//
//   [Brew again] [Cancel]
//   [Coffee edit form: Save coffee, Cancel]
//
// When idle: [Brew again] [Edit]. No disclosure triangles.
export function CoffeeEditor({ coffee, update, brewAgainHref }: {
  coffee: { name: string; remaining_weight_g: number | null; received_date: string | null };
  update: (formData: FormData) => Promise<void>;
  brewAgainHref: string;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div>
      <div className="mt-3 flex gap-2">
        <Link
          href={brewAgainHref}
          className="min-h-11 flex-1 rounded-[10px] bg-ember px-4 py-2 text-center font-medium text-white"
        >
          Brew again
        </Link>
        <Button variant="ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </div>
      {editing ? (
        <Card className="mt-3">
          <form action={update} className="flex flex-col gap-3">
            <div><Label>Name</Label><Input name="name" defaultValue={coffee.name} /></div>
            <div><Label>Remaining g</Label><Input name="remainingWeightG" type="number" inputMode="decimal" defaultValue={coffee.remaining_weight_g ?? ""} /></div>
            <div><Label>Received</Label><Input name="receivedDate" type="date" defaultValue={coffee.received_date ?? ""} /></div>
            <div className="flex gap-2">
              <Button>Save coffee</Button>
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
