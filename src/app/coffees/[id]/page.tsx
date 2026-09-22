import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getCoffee, listBrews, listCuppings } from "@/lib/db/queries";
import { createCupping, deleteCoffee, deleteCupping, updateCoffee, updateCupping } from "@/app/actions";
import { Button, Card, Input, Label, SectionHeader, Textarea } from "@/components/ui/controls";
import { CoffeeEditor } from "@/components/coffee-editor";
import { BackLink } from "@/components/back-link";
import { CuppingEditor, type CuppingRow } from "@/components/cupping-editor";
import { DeleteButton } from "@/components/delete-button";
import { BrewHistoryRow } from "@/components/brew-history-row";
import { EmptyState } from "@/components/states";
import { describeDeletion } from "@/lib/domain/deletion";
import { formatBrewDate, formatReceived, defaultBrewedDate } from "@/lib/domain/brew-date";

export default async function CoffeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/coffees/${id}`);
  const coffee = await getCoffee(id).catch(() => null);
  if (!coffee) notFound();
  // independent reads, one round trip instead of two sequential ones
  const [brews, cuppings] = await Promise.all([
    listBrews(id).catch(() => []),
    listCuppings(id).catch(() => []),
  ]);
  const update = updateCoffee.bind(null, id);
  const noted = brews.filter((b: { observations?: unknown }) => {
    const o = b.observations;
    return Array.isArray(o) ? o.length > 0 : o != null;
  }).length;
  const del = describeDeletion("coffee", { brews: brews.length, observations: noted });
  const remove = deleteCoffee.bind(null, id);
  const today = defaultBrewedDate();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/coffees" label="Coffees" />
        <h1 className="font-display text-2xl">{coffee.name}</h1>
        <p className="tnum mt-1 text-sm text-ink2">
          {[coffee.origin, coffee.process].filter(Boolean).join(" · ") || "origin/process unknown"}
        </p>
        <p className="tnum mt-0.5 text-sm text-ink2">
          ~{coffee.remaining_weight_g ?? "?"} g remaining · Received {formatReceived(coffee.received_date)}
        </p>
        <CoffeeEditor
          coffee={coffee}
          update={update}
          brewAgainHref={brews.length > 0 ? `/brews/new?coffee=${id}&copy=1` : `/brews/new?coffee=${id}`}
        />
      </div>
      <div>
        <SectionHeader>Brews ({brews.length})</SectionHeader>
        {brews.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No brews of this coffee"
              body="Start from the competition defaults and adjust from there."
              actionHref={`/brews/new?coffee=${id}`}
              actionLabel="+ Brew it"
            />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {brews.map((b: {
              id: string; dose_g: number; water_g: number; temp_c: number | null;
              grind_clicks: number | null; total_time_sec: number | null;
              brewed_at: string | null; created_at: string; session_id: string | null;
              session: { title: string } | null; observations: unknown;
            }) => (
              <li key={b.id}><BrewHistoryRow brew={b} /></li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <SectionHeader>Cupping ({cuppings.length})</SectionHeader>
        <p className="mt-1 text-sm text-ink2">
          Taste {coffee.name} before spending brew doses — a baseline for what follows.
        </p>
        {cuppings.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {(cuppings as CuppingRow[]).map((c) => {
              const edit = updateCupping.bind(null, c.id, id);
              const removeCupping = deleteCupping.bind(null, c.id, id);
              const cdel = describeDeletion("cupping", {});
              const grindLabel =
                [c.grinder, c.grind_clicks != null ? `${c.grind_clicks}` : null]
                  .filter(Boolean)
                  .join(" ") || c.grind;
              const hasNotes = Boolean(c.hot_notes || c.warm_notes || c.cold_notes || c.notes);
              return (
                <li key={c.id} className="rounded-[10px] border border-line bg-card px-3 py-2">
                  <div className="tnum flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {c.dose_g ?? "?"} g / {c.water_g ?? "?"} g{grindLabel ? ` · ${grindLabel}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-ink3">{formatBrewDate(c.cupped_at)}</span>
                  </div>
                  {hasNotes ? (
                    <>
                      {[["Hot", c.hot_notes], ["Warm", c.warm_notes], ["Cold", c.cold_notes]].map(([stage, text]) =>
                        text ? (
                          <p key={stage as string} className="mt-1 text-sm text-ink2">
                            <span className="font-medium text-ink">{stage}: </span>{text as string}
                          </p>
                        ) : null,
                      )}
                      {c.notes ? <p className="mt-1 text-sm text-ink2">{c.notes}</p> : null}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-ink3">No tasting notes recorded.</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <CuppingEditor cupping={c} update={edit} />
                    <DeleteButton
                      label="Delete"
                      title={cdel.title}
                      body={cdel.body}
                      confirmLabel={cdel.confirm}
                      action={removeCupping}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Log a cupping</summary>
          <Card>
            <form action={createCupping} className="flex flex-col gap-3">
              <input type="hidden" name="coffeeId" value={id} />
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="cupping-date">Date</Label><Input id="cupping-date" name="cuppedAt" type="date" defaultValue={today} /></div>
                <div><Label htmlFor="cupping-dose">Dose g</Label><Input id="cupping-dose" name="doseG" type="number" inputMode="decimal" placeholder="10" /></div>
                <div><Label htmlFor="cupping-water">Water g</Label><Input id="cupping-water" name="waterG" type="number" inputMode="decimal" placeholder="200" /></div>
                <div><Label htmlFor="cupping-grinder">Grinder</Label><Input id="cupping-grinder" name="grinder" placeholder="K-Ultra" /></div>
                <div><Label htmlFor="cupping-clicks">Grind clicks</Label><Input id="cupping-clicks" name="grindClicks" type="number" inputMode="numeric" placeholder="85" /></div>
              </div>
              <div><Label htmlFor="cupping-hot">Hot notes</Label><Textarea id="cupping-hot" name="hotNotes" rows={2} /></div>
              <div><Label htmlFor="cupping-warm">Warm notes</Label><Textarea id="cupping-warm" name="warmNotes" rows={2} /></div>
              <div><Label htmlFor="cupping-cold">Cold notes</Label><Textarea id="cupping-cold" name="coldNotes" rows={2} /></div>
              <div><Label htmlFor="cupping-notes">Notes</Label><Textarea id="cupping-notes" name="notes" rows={2} /></div>
              <Button>Save cupping</Button>
            </form>
          </Card>
        </details>
      </div>
      <DeleteButton
        label="Delete coffee"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
