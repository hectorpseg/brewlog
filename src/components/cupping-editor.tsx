"use client";
import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "./ui/controls";
import { toDateInputValue } from "@/lib/domain/brew-date";

export type CuppingRow = {
  id: string;
  cupped_at: string | null;
  dose_g: number | null;
  water_g: number | null;
  grind: string | null;
  grinder: string | null;
  grind_clicks: number | null;
  notes: string | null;
  hot_notes: string | null;
  warm_notes: string | null;
  cold_notes: string | null;
};

// Inline edit toggle for one cupping row. Same pattern as CoffeeEditor:
// explicit Edit button, Cancel to back out, no modal.
export function CuppingEditor({ cupping, update }: {
  cupping: CuppingRow;
  update: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <Button variant="ghost" className="px-3 py-1 text-sm" onClick={() => setEditing(true)}>
        Edit
      </Button>
    );
  }
  return (
    <Card>
      <form action={update} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor={`cup-date-${cupping.id}`}>Date</Label><Input id={`cup-date-${cupping.id}`} name="cuppedAt" type="date" defaultValue={toDateInputValue(cupping.cupped_at)} /></div>
          <div><Label htmlFor={`cup-grinder-${cupping.id}`}>Grinder</Label><Input id={`cup-grinder-${cupping.id}`} name="grinder" defaultValue={cupping.grinder ?? ""} placeholder="K-Ultra" /></div>
          <div><Label htmlFor={`cup-clicks-${cupping.id}`}>Grind clicks</Label><Input id={`cup-clicks-${cupping.id}`} name="grindClicks" type="number" inputMode="numeric" defaultValue={cupping.grind_clicks ?? ""} placeholder="85" /></div>
          <div><Label htmlFor={`cup-dose-${cupping.id}`}>Dose g</Label><Input id={`cup-dose-${cupping.id}`} name="doseG" type="number" inputMode="decimal" defaultValue={cupping.dose_g ?? ""} /></div>
          <div><Label htmlFor={`cup-water-${cupping.id}`}>Water g</Label><Input id={`cup-water-${cupping.id}`} name="waterG" type="number" inputMode="decimal" defaultValue={cupping.water_g ?? ""} /></div>
        </div>
        <div><Label htmlFor={`cup-hot-${cupping.id}`}>Hot notes</Label><Textarea id={`cup-hot-${cupping.id}`} name="hotNotes" rows={2} defaultValue={cupping.hot_notes ?? ""} /></div>
        <div><Label htmlFor={`cup-warm-${cupping.id}`}>Warm notes</Label><Textarea id={`cup-warm-${cupping.id}`} name="warmNotes" rows={2} defaultValue={cupping.warm_notes ?? ""} /></div>
        <div><Label htmlFor={`cup-cold-${cupping.id}`}>Cold notes</Label><Textarea id={`cup-cold-${cupping.id}`} name="coldNotes" rows={2} defaultValue={cupping.cold_notes ?? ""} /></div>
        <div><Label htmlFor={`cup-notes-${cupping.id}`}>Notes</Label><Textarea id={`cup-notes-${cupping.id}`} name="notes" rows={2} defaultValue={cupping.notes ?? ""} /></div>
        <div className="flex gap-2">
          <Button>Save cupping</Button>
          <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
