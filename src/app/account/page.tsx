import { requireUser } from "@/lib/supabase/require-user";
import { logout } from "@/app/actions";
import { Button, Card, SectionHeader } from "@/components/ui/controls";
import { LocaleSelect } from "@/components/locale-select";
import { getT } from "@/lib/i18n/server";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const t = await getT();
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
    </div>
  );
}
