import { UpdatePasswordForm } from "./form";
import { getT } from "@/lib/i18n/server";

// ponytail: intentionally no auth check here. A recovery link IS a session,
// so a server-side "already signed in, redirect" would lock out the exact
// user this page exists for. This page renders no app content either way.
export default async function UpdatePasswordPage() {
  const t = await getT();
  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl">{t("auth.update.title")}</h1>
      <p className="mb-4 mt-1 text-sm text-ink2">
        {t("auth.update.intro")}
      </p>
      <UpdatePasswordForm />
    </div>
  );
}
