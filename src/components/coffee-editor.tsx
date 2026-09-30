import Link from "next/link";
import { Button, Card, Input, Label } from "./ui/controls";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { getT } from "@/lib/i18n/server";

// The detail screen is the form: action row on top, fields below, no edit
// gate. Opening the coffee goes straight to its editable representation.
export async function CoffeeEditor({ coffee, update, brewAgainHref }: {
  coffee: {
    name: string; remaining_weight_g: number | null; received_date: string | null;
    origin?: string | null; process?: string | null;
    variety?: string | null; producer?: string | null; country?: string | null;
    region?: string | null; farm?: string | null; altitude?: string | null;
  };
  update: (formData: FormData) => Promise<void>;
  brewAgainHref: string;
}) {
  const t = await getT();
  return (
    <div>
      <div className="mt-3 flex gap-2">
        <Link
          href={brewAgainHref}
          className="min-h-11 flex-1 rounded-[10px] bg-ember px-4 py-2 text-center font-medium text-white"
        >
          {t("coffee.editor.brewAgain")}
        </Link>
      </div>
      <Card className="mt-3">
        <form action={update} className="flex flex-col gap-3">
          <div><Label>{t("coffee.field.name")}</Label><Input name="name" defaultValue={coffee.name} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("coffee.field.origin")}</Label><Input name="origin" defaultValue={coffee.origin ?? ""} /></div>
            <div><Label>{t("coffee.field.process")}</Label><Input name="process" defaultValue={coffee.process ?? ""} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("coffee.field.variety")}</Label><Input name="variety" defaultValue={coffee.variety ?? ""} /></div>
            <div><Label>{t("coffee.field.producer")}</Label><Input name="producer" defaultValue={coffee.producer ?? ""} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("coffee.field.country")}</Label><Input name="country" defaultValue={coffee.country ?? ""} /></div>
            <div><Label>{t("coffee.field.region")}</Label><Input name="region" defaultValue={coffee.region ?? ""} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("coffee.field.farm")}</Label><Input name="farm" defaultValue={coffee.farm ?? ""} /></div>
            <div><Label>{t("coffee.field.altitude")}</Label><Input name="altitude" defaultValue={coffee.altitude ?? ""} /></div>
          </div>
          <div><Label>{t("coffee.field.remaining")}</Label><Input name="remainingWeightG" type="number" step="any" inputMode="decimal" defaultValue={coffee.remaining_weight_g ?? ""} /></div>
          <div><Label>{t("coffee.field.received")}</Label><Input name="receivedDate" type="date" max={defaultBrewedDate()} defaultValue={coffee.received_date ?? ""} /></div>
          <div>
            <Button>{t("coffee.save")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
