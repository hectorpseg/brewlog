"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "@/components/ui/controls";
import { useT } from "@/lib/i18n/client";

// ponytail: one small form, no hook-form/zod — a single email field needs neither.
export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || sent) return; // ponytail: no duplicate reset emails
    setPending(true);
    setError(null);
    const db = createClient();
    const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setPending(false);
    if (error) {
      setError(t("auth.reset.genericError"));
      return;
    }
    // Generic message either way: never reveal whether the email exists.
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <p role="status" className="text-sm">
          {t("auth.reset.sent")}<strong>{email.trim()}</strong>{t("auth.reset.sentTail")}
        </p>
        <Link href="/login" className="mt-3 inline-block min-h-11 py-2 text-sm underline">
          {t("auth.reset.backToSignIn")}
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="email">{t("auth.field.email")}</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-[10px] border border-ember px-3 py-2 text-sm text-ember">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || email.trim() === ""}>
          {pending ? t("auth.reset.sending") : t("auth.reset.send")}
        </Button>
        <Link href="/login" className="inline-block min-h-11 py-2 text-sm text-ink2 underline">
          {t("auth.reset.backToSignIn")}
        </Link>
      </form>
    </Card>
  );
}
