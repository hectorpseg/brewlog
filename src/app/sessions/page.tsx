import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSession } from "@/app/actions";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";

export default async function SessionsPage() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: sessions } = await db.from("sessions").select("*").order("created_at", { ascending: false }).limit(30);
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Sessions</h1>
      <Card>
        <form action={createSession} className="flex flex-col gap-3">
          <div><Label>Title *</Label><Input name="title" required maxLength={120} placeholder="e.g. Phase 1 Origami exploration" /></div>
          <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
          <Button>Save session</Button>
        </form>
      </Card>
      {(sessions ?? []).map((s: { id: string; title: string }) => (
        <Card key={s.id}><div className="font-medium">{s.title}</div></Card>
      ))}
    </div>
  );
}
