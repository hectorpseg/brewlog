"use client";
import { Button, Card, Input, Label, Select, Textarea } from "./ui/controls";
import { defaultBrewedDate, toDateInputValue } from "@/lib/domain/brew-date";

export type CuppingRow = {
  id: string;
  coffee_id?: string | null;
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

// Single cupping form for create and edit. No edit gate: the form itself is
// the representation, shown inline or inside a disclosure. Server actions
// validate (including no-future-dates); `max` mirrors it in the UI.
export function CuppingForm({ action, cupping, coffees, initialCoffeeId, submitLabel, idPrefix }: {
  action: (formData: FormData) => Promise<void>;
  cupping?: CuppingRow | null;
  coffees?: { id: string; name: string }[];
  initialCoffeeId?: string;
  submitLabel: string;
  idPrefix: string;
}) {
  const today = defaultBrewedDate();
  const coffeeId = cupping?.coffee_id ?? initialCoffeeId ?? "";
  return (
    <Card>
      <form action={action} className="flex flex-col gap-3">
        {coffees ? (
          <div>
            <Label htmlFor={`${idPrefix}-coffee`}>Coffee *</Label>
            <Select id={`${idPrefix}-coffee`} name="coffeeId" defaultValue={coffeeId} required>
              <option value="">Pick a coffee…</option>
              {coffees.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        ) : (
          <input type="hidden" name="coffeeId" value={coffeeId} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor={`${idPrefix}-date`}>Date</Label><Input id={`${idPrefix}-date`} name="cuppedAt" type="date" max={today} defaultValue={cupping ? toDateInputValue(cupping.cupped_at) : today} /></div>
          <div><Label htmlFor={`${idPrefix}-dose`}>Dose g</Label><Input id={`${idPrefix}-dose`} name="doseG" type="number" inputMode="decimal" placeholder="10" defaultValue={cupping?.dose_g ?? ""} /></div>
          <div><Label htmlFor={`${idPrefix}-water`}>Water g</Label><Input id={`${idPrefix}-water`} name="waterG" type="number" inputMode="decimal" placeholder="200" defaultValue={cupping?.water_g ?? ""} /></div>
          <div><Label htmlFor={`${idPrefix}-grinder`}>Grinder</Label><Input id={`${idPrefix}-grinder`} name="grinder" placeholder="K-Ultra" defaultValue={cupping?.grinder ?? ""} /></div>
          <div><Label htmlFor={`${idPrefix}-clicks`}>Grind clicks</Label><Input id={`${idPrefix}-clicks`} name="grindClicks" type="number" inputMode="numeric" placeholder="85" defaultValue={cupping?.grind_clicks ?? ""} /></div>
        </div>
        <div><Label htmlFor={`${idPrefix}-hot`}>Hot notes</Label><Textarea id={`${idPrefix}-hot`} name="hotNotes" rows={2} defaultValue={cupping?.hot_notes ?? ""} /></div>
        <div><Label htmlFor={`${idPrefix}-warm`}>Warm notes</Label><Textarea id={`${idPrefix}-warm`} name="warmNotes" rows={2} defaultValue={cupping?.warm_notes ?? ""} /></div>
        <div><Label htmlFor={`${idPrefix}-cold`}>Cold notes</Label><Textarea id={`${idPrefix}-cold`} name="coldNotes" rows={2} defaultValue={cupping?.cold_notes ?? ""} /></div>
        <div><Label htmlFor={`${idPrefix}-take`}>Final take</Label><Textarea id={`${idPrefix}-take`} name="notes" rows={2} defaultValue={cupping?.notes ?? ""} /></div>
        <Button>{submitLabel}</Button>
      </form>
    </Card>
  );
}
