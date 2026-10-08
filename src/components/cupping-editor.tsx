"use client";
import { Button, Card, Input, Label, Select, Textarea } from "./ui/controls";
import { defaultBrewedDate, toDateInputValue } from "@/lib/domain/brew-date";
import { useT } from "@/lib/i18n/client";

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
  const t = useT();
  return (
    <Card>
      <form action={action} className="flex flex-col gap-3">
        {coffees ? (
          <div>
            <Label htmlFor={`${idPrefix}-coffee`}>{t("brew.field.coffee")} *</Label>
            <Select id={`${idPrefix}-coffee`} name="coffeeId" defaultValue={coffeeId} required>
              <option value="">{t("brew.pickCoffee")}</option>
              {coffees.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        ) : (
          <input type="hidden" name="coffeeId" value={coffeeId} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 min-w-0 sm:col-span-1"><Label htmlFor={`${idPrefix}-date`}>{t("cupping.field.date")}</Label><Input id={`${idPrefix}-date`} name="cuppedAt" type="date" max={today} defaultValue={cupping ? toDateInputValue(cupping.cupped_at) : today} /></div>
          <div><Label htmlFor={`${idPrefix}-dose`}>{t("cupping.field.dose")}</Label><Input id={`${idPrefix}-dose`} name="doseG" type="number" step="any" inputMode="decimal" placeholder={t("cupping.placeholder.dose")} defaultValue={cupping?.dose_g ?? ""} /></div>
          <div><Label htmlFor={`${idPrefix}-water`}>{t("cupping.field.water")}</Label><Input id={`${idPrefix}-water`} name="waterG" type="number" step="any" inputMode="decimal" placeholder={t("cupping.placeholder.water")} defaultValue={cupping?.water_g ?? ""} /></div>
        </div>
        <div className="border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor={`${idPrefix}-grinder`}>{t("cupping.field.grinder")}</Label><Input id={`${idPrefix}-grinder`} name="grinder" placeholder="K-Ultra" defaultValue={cupping?.grinder ?? ""} /></div>
            <div><Label htmlFor={`${idPrefix}-clicks`}>{t("cupping.field.grindClicks")}</Label><Input id={`${idPrefix}-clicks`} name="grindClicks" type="number" inputMode="numeric" placeholder={t("cupping.placeholder.clicks")} defaultValue={cupping?.grind_clicks ?? ""} /></div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <div><Label htmlFor={`${idPrefix}-hot`}>{t("tasting.notes.hot")}</Label><Textarea id={`${idPrefix}-hot`} name="hotNotes" rows={2} defaultValue={cupping?.hot_notes ?? ""} /></div>
          <div><Label htmlFor={`${idPrefix}-warm`}>{t("tasting.notes.warm")}</Label><Textarea id={`${idPrefix}-warm`} name="warmNotes" rows={2} defaultValue={cupping?.warm_notes ?? ""} /></div>
          <div><Label htmlFor={`${idPrefix}-cold`}>{t("tasting.notes.cold")}</Label><Textarea id={`${idPrefix}-cold`} name="coldNotes" rows={2} defaultValue={cupping?.cold_notes ?? ""} /></div>
        </div>
        <div className="border-t border-line pt-3">
          <Label htmlFor={`${idPrefix}-take`}>{t("cupping.field.finalTake")}</Label>
          <Textarea id={`${idPrefix}-take`} name="notes" rows={2} defaultValue={cupping?.notes ?? ""} />
        </div>
        <Button>{submitLabel}</Button>
      </form>
    </Card>
  );
}
