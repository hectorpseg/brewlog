import { createCoffee } from "@/app/actions";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";

export default async function NewCoffeePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold">New coffee</h1>
      {sp.error ? <p className="mb-3 text-sm text-red-600">{sp.error}</p> : null}
      <Card>
        <form action={createCoffee} className="flex flex-col gap-3">
          <div><Label htmlFor="name">Name *</Label><Input id="name" name="name" required maxLength={120} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="origin">Origin (optional)</Label><Input id="origin" name="origin" /></div>
            <div><Label htmlFor="process">Process (optional)</Label><Input id="process" name="process" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="initialWeightG">Initial g</Label><Input id="initialWeightG" name="initialWeightG" type="number" inputMode="decimal" /></div>
            <div><Label htmlFor="receivedDate">Received</Label><Input id="receivedDate" name="receivedDate" placeholder="2026-.." /></div>
          </div>
          <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} /></div>
          <Button>Save coffee</Button>
        </form>
      </Card>
    </div>
  );
}
