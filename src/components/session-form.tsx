"use client";
import { Button, Card, Input, Label, Textarea } from "./ui/controls";
import { useT } from "@/lib/i18n/client";

// Single Session form for create and edit (the CuppingForm pattern): the page
// supplies the action, existing values, and submit label. Title/Notes are
// user-entered data and never translated.
export function SessionForm({ action, session, submitLabel, idPrefix }: {
  action: (formData: FormData) => Promise<void>;
  session?: { title: string; notes: string | null };
  submitLabel: string;
  idPrefix: string;
}) {
  const t = useT();
  return (
    <Card>
      <form action={action} className="flex flex-col gap-3">
        <div><Label htmlFor={`${idPrefix}-title`}>{t("session.field.title")} *</Label><Input id={`${idPrefix}-title`} name="title" defaultValue={session?.title ?? ""} required maxLength={120} /></div>
        <div><Label htmlFor={`${idPrefix}-notes`}>{t("session.field.notes")}</Label><Textarea id={`${idPrefix}-notes`} name="notes" rows={2} defaultValue={session?.notes ?? ""} /></div>
        <div>
          <Button>{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
