import { requireUser } from "@/lib/supabase/require-user";
import { createSession } from "@/app/actions";
import { BackLink } from "@/components/back-link";
import { SessionForm } from "@/components/session-form";
import { getT } from "@/lib/i18n/server";

export default async function NewSessionPage() {
  const t = await getT();
  await requireUser("/sessions/new");
  return (
    <div>
      <BackLink href="/sessions" label={t("nav.sessions")} />
      <h1 className="mb-3 font-display text-2xl">{t("session.new.title")}</h1>
      <SessionForm action={createSession} submitLabel={t("session.save")} idPrefix="session-new" />
    </div>
  );
}
