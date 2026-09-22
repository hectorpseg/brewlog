import { requireUser } from "@/lib/supabase/require-user";
import { getCompetitionSettings } from "@/lib/db/queries";
import { DEFAULT_MIN_BEVERAGE_G } from "@/lib/validation/schemas";
import { logout, updateCompetitionSettings } from "@/app/actions";
import { Button, Card, Input, Label, SectionHeader } from "@/components/ui/controls";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const settings = await getCompetitionSettings().catch(() => null);
  const minBeverage = settings?.min_final_beverage_g != null
    ? Number(settings.min_final_beverage_g)
    : DEFAULT_MIN_BEVERAGE_G;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Account</h1>
      <Card>
        <div className="text-sm text-ink2">Signed in as</div>
        <div className="font-medium">{user.email}</div>
        <form action={logout} className="mt-3">
          <Button variant="ghost">Sign out</Button>
        </form>
      </Card>
      <div>
        <SectionHeader>Competition target</SectionHeader>
        <Card className="mt-2">
          <form action={updateCompetitionSettings} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="comp-name">Competition</Label>
              <Input id="comp-name" name="name" maxLength={120} defaultValue={settings?.name ?? "Current competition"} />
            </div>
            <div>
              <Label htmlFor="comp-min">Minimum final beverage (g)</Label>
              <Input id="comp-min" name="minFinalBeverageG" type="number" inputMode="decimal" required defaultValue={minBeverage} />
            </div>
            <p className="text-sm text-ink2">
              Shown as the target on the brew form. A default for this competition, not a universal rule.
            </p>
            <Button>Save target</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
