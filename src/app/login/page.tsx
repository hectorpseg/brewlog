import { redirect } from "next/navigation";
import Link from "next/link";
import { login } from "@/app/actions";
import { safeNext } from "@/lib/auth";
import { getCachedUser } from "@/lib/supabase/require-user";
import { Button, Card, Input, Label } from "@/components/ui/controls";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/errors";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string; updated?: string }>;
}) {
  const sp = await searchParams;
  const t = await getT();
  const next = safeNext(sp.next);
  // Auth shell: already signed in means the login form is the wrong screen.
  // One cached getUser read, shared with any other caller in this render.
  const user = await getCachedUser();
  if (user) redirect(next);
  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl">BrewLog</h1>
      <p className="mb-4 mt-1 text-sm text-ink2">{t("auth.tagline")}</p>
      {sp.updated ? (
        <p role="status" className="mb-3 rounded-[10px] border border-line px-3 py-2 text-sm">
          {t("auth.updatedNotice")}
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className="mb-3 rounded-[10px] border border-ember px-3 py-2 text-sm text-ember">
          {errorText(sp.error, t)}
        </p>
      ) : null}
      <Card>
        <form className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <div>
            <Label htmlFor="email">{t("auth.field.email")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">{t("auth.field.password")}</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
            <Link href="/forgot-password" className="mt-1 inline-block min-h-11 py-2 text-sm text-ink2 underline">
              {t("auth.forgotLink")}
            </Link>
          </div>
          <div className="flex gap-2">
            <Button formAction={login}>{t("auth.signIn")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
