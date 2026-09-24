import { requireUser } from "@/lib/supabase/require-user";
import { createCoffee } from "@/app/actions";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { BackLink } from "@/components/back-link";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";

export default async function NewCoffeePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/coffees/new");
  const sp = await searchParams;
  return (
    <div>
      <BackLink href="/coffees" label="Coffees" />
      <h1 className="mb-3 font-display text-2xl">New coffee</h1>
      {sp.error ? (
        <p role="alert" className="mb-3 rounded-[10px] border border-ember px-3 py-2 text-sm text-ember">
          {sp.error}
        </p>
      ) : null}
      <Card>
        <form action={createCoffee} className="flex flex-col gap-3">
          <div><Label htmlFor="name">Name *</Label><Input id="name" name="name" required maxLength={120} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="origin">Origin (optional)</Label><Input id="origin" name="origin" /></div>
            <div><Label htmlFor="process">Process (optional)</Label><Input id="process" name="process" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="variety">Variety (optional)</Label><Input id="variety" name="variety" /></div>
            <div><Label htmlFor="producer">Producer (optional)</Label><Input id="producer" name="producer" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="country">Country (optional)</Label><Input id="country" name="country" /></div>
            <div><Label htmlFor="region">Region (optional)</Label><Input id="region" name="region" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="farm">Farm / estate (optional)</Label><Input id="farm" name="farm" /></div>
            <div><Label htmlFor="altitude">Altitude (optional)</Label><Input id="altitude" name="altitude" inputMode="numeric" placeholder="e.g. 1800-2000 masl" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="initialWeightG">Initial g</Label><Input id="initialWeightG" name="initialWeightG" type="number" inputMode="decimal" /></div>
            <div><Label htmlFor="receivedDate">Received</Label><Input id="receivedDate" name="receivedDate" type="date" max={defaultBrewedDate()} /></div>
          </div>
          <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} /></div>
          <Button>Save coffee</Button>
        </form>
      </Card>
    </div>
  );
}
