import { requireUser } from "@/lib/supabase/require-user";
import { createCoffee } from "@/app/actions";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { BackLink } from "@/components/back-link";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/errors";

export default async function NewCoffeePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/coffees/new");
  const t = await getT();
  const optional = t("coffee.optionalSuffix");
  const sp = await searchParams;
  return (
    <div>
      <BackLink href="/coffees" label={t("nav.coffees")} />
      <h1 className="mb-3 font-display text-2xl">{t("coffee.new.title")}</h1>
      {sp.error ? (
        <p role="alert" className="mb-3 rounded-[10px] border border-ember px-3 py-2 text-sm text-ember">
          {errorText(sp.error, t)}
        </p>
      ) : null}
      <Card>
        <form action={createCoffee} className="flex flex-col gap-3">
          <div><Label htmlFor="name">{t("coffee.field.name")} *</Label><Input id="name" name="name" required maxLength={120} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="origin">{t("coffee.field.origin")} {optional}</Label><Input id="origin" name="origin" /></div>
            <div><Label htmlFor="process">{t("coffee.field.process")} {optional}</Label><Input id="process" name="process" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="variety">{t("coffee.field.variety")} {optional}</Label><Input id="variety" name="variety" /></div>
            <div><Label htmlFor="producer">{t("coffee.field.producer")} {optional}</Label><Input id="producer" name="producer" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="country">{t("coffee.field.country")} {optional}</Label><Input id="country" name="country" /></div>
            <div><Label htmlFor="region">{t("coffee.field.region")} {optional}</Label><Input id="region" name="region" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="farm">{t("coffee.field.farm")} {optional}</Label><Input id="farm" name="farm" /></div>
            <div><Label htmlFor="altitude">{t("coffee.field.altitude")} {optional}</Label><Input id="altitude" name="altitude" inputMode="numeric" placeholder={t("coffee.placeholder.altitude")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="initialWeightG">{t("coffee.field.initialWeight")}</Label><Input id="initialWeightG" name="initialWeightG" type="number" step="any" inputMode="decimal" /></div>
            <div className="col-span-2 sm:col-span-1"><Label htmlFor="receivedDate">{t("coffee.field.received")}</Label><Input id="receivedDate" name="receivedDate" type="date" max={defaultBrewedDate()} /></div>
          </div>
          <div><Label htmlFor="notes">{t("coffee.field.notes")}</Label><Textarea id="notes" name="notes" rows={3} /></div>
          <Button>{t("coffee.save")}</Button>
        </form>
      </Card>
    </div>
  );
}
