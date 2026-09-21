import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBrew } from "@/lib/db/queries";
import { diffBrews } from "@/lib/domain/compare";
import { Card } from "@/components/ui/controls";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const sp = await searchParams;
  if (!sp.a || !sp.b) return <Card><p className="text-sm">Pick two brews to compare.</p></Card>;
  const [a, b] = await Promise.all([getBrew(sp.a).catch(() => null), getBrew(sp.b).catch(() => null)]);
  if (!a || !b) return <Card><p className="text-sm">Brews not found.</p></Card>;
  const diff = diffBrews(a, b);
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Compare</h1>
      <Card>
        <h2 className="font-medium">What changed</h2>
        <ul className="text-sm">{diff.changed.map((k) => <li key={k}>{k}: {String(a[k] ?? "—")} → {String(b[k] ?? "—")}</li>)}</ul>
      </Card>
      <Card>
        <h2 className="font-medium">What stayed the same</h2>
        <p className="text-sm text-zinc-600">{diff.same.join(", ") || "nothing"}</p>
      </Card>
    </div>
  );
}
