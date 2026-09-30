import { requireUser } from "@/lib/supabase/require-user";
import { getCompetitionSettings } from "@/lib/db/queries";
import { DEFAULT_MIN_BEVERAGE_G } from "@/lib/validation/schemas";
import { logout, updateCompetitionSettings } from "@/app/actions";
import { Button, Card, Input, Label, SectionHeader } from "@/components/ui/controls";
import { LocaleSelect } from "@/components/locale-select";
import { getT } from "@/lib/i18n/server";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const t = await getT();
  const settings = await getCompetitionSettings().catch(() => null);
  const minBeverage = settings?.min_final_beverage_g != null
    ? Number(settings.min_final_beverage_g)
    : DEFAULT_MIN_BEVERAGE_G;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">{t("account.title")}</h1>
      <Card>
        <div className="text-sm text-ink2">{t("account.signedInAs")}</div>
        <div className="font-medium">{user.email}</div>
        <form action={logout} className="mt-3">
          <Button variant="ghost">{t("account.signOut")}</Button>
        </form>
      </Card>
      <div>
        <SectionHeader>{t("nav.language")}</SectionHeader>
        <Card className="mt-2">
          <LocaleSelect />
        </Card>
      </div>
      <div>
        <SectionHeader>{t("account.competitionTarget")}</SectionHeader>
        <Card className="mt-2">
          <form action={updateCompetitionSettings} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="comp-name">{t("account.competition")}</Label>
              <Input id="comp-name" name="name" maxLength={120} defaultValue={settings?.name ?? t("account.competitionPlaceholder")} />
            </div>
            <div>
              <Label htmlFor="comp-min">{t("account.minBeverage")}</Label>
              <Input id="comp-min" name="minFinalBeverageG" type="number" step="any" inputMode="decimal" required defaultValue={minBeverage} />
            </div>
            <p className="text-sm text-ink2">
              {t("account.competitionHint")}
            </p>
            <Button>{t("account.saveTarget")}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
