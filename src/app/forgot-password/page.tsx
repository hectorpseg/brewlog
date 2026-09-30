import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/require-user";
import { ForgotPasswordForm } from "./form";
import { getT } from "@/lib/i18n/server";

export default async function ForgotPasswordPage() {
  // Already signed in means no reset is needed; same rule as /login.
  const user = await getCachedUser();
  if (user) redirect("/brews");
  const t = await getT();
  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl">{t("auth.reset.title")}</h1>
      <p className="mb-4 mt-1 text-sm text-ink2">
        {t("auth.reset.intro")}
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
