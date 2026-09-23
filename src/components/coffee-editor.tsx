import Link from "next/link";
import { Button, Card, Input, Label } from "./ui/controls";
import { defaultBrewedDate } from "@/lib/domain/brew-date";

// The detail screen is the form: action row on top, fields below, no edit
// gate. Opening the coffee goes straight to its editable representation.
export function CoffeeEditor({ coffee, update, brewAgainHref }: {
  coffee: { name: string; remaining_weight_g: number | null; received_date: string | null };
  update: (formData: FormData) => Promise<void>;
  brewAgainHref: string;
}) {
  return (
    <div>
      <div className="mt-3 flex gap-2">
        <Link
          href={brewAgainHref}
          className="min-h-11 flex-1 rounded-[10px] bg-ember px-4 py-2 text-center font-medium text-white"
        >
          Brew again
        </Link>
      </div>
      <Card className="mt-3">
        <form action={update} className="flex flex-col gap-3">
          <div><Label>Name</Label><Input name="name" defaultValue={coffee.name} /></div>
          <div><Label>Remaining g</Label><Input name="remainingWeightG" type="number" inputMode="decimal" defaultValue={coffee.remaining_weight_g ?? ""} /></div>
          <div><Label>Received</Label><Input name="receivedDate" type="date" max={defaultBrewedDate()} defaultValue={coffee.received_date ?? ""} /></div>
          <div>
            <Button>Save coffee</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
