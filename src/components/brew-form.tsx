"use client";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { brewSchema, type BrewInput } from "@/lib/validation/schemas";
import { COMPETITION_DEFAULTS } from "@/lib/domain/defaults";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";
import { SaveStateBadge } from "@/components/save-state";
import { formatRatio } from "@/lib/domain/ratio";

type Props = {
  userId: string;
  coffees: { id: string; name: string; remaining_weight_g: number | null }[];
  initialCoffeeId?: string;
  copyFrom?: Record<string, unknown> | null;
};

function defaults(copyFrom?: Record<string, unknown> | null, coffeeId?: string): BrewInput {
  const c = (copyFrom ?? {}) as Record<string, string | number | undefined>;
  return {
    coffeeId: (c.coffee_id as string) ?? coffeeId ?? "",
    doseG: Number(c.dose_g ?? COMPETITION_DEFAULTS.doseG),
    waterG: Number(c.water_g ?? COMPETITION_DEFAULTS.waterG),
    tempC: c.temp_c != null ? Number(c.temp_c) : COMPETITION_DEFAULTS.tempC,
    grindClicks: c.grind_clicks != null ? Number(c.grind_clicks) : COMPETITION_DEFAULTS.grindClicks,
    grinder: (c.grinder as string) ?? COMPETITION_DEFAULTS.grinder,
    dripper: (c.dripper as string) ?? COMPETITION_DEFAULTS.dripper,
    filter: (c.filter as string) ?? COMPETITION_DEFAULTS.filter,
    waterSource: (c.water_source as string) ?? COMPETITION_DEFAULTS.waterSource,
    pourCount: c.pour_count != null ? Number(c.pour_count) : COMPETITION_DEFAULTS.pourCount,
    totalTimeSec: c.total_time_sec != null ? Number(c.total_time_sec) : undefined,
    finalBeverageG: c.final_beverage_g != null ? Number(c.final_beverage_g) : undefined,
    notes: (c.notes as string) ?? undefined,
  };
}

export function BrewForm({ userId, coffees, initialCoffeeId, copyFrom }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<BrewInput>({
    // ponytail: zodResolver only here (complex form); simple forms use server actions
    resolver: zodResolver(brewSchema) as unknown as Resolver<BrewInput>,
    defaultValues: defaults(copyFrom, initialCoffeeId),
  });
  const values = form.watch();
  const key = draftKey(userId, "brew", copyFrom ? `copy-${(copyFrom as { id?: string }).id ?? "new"}` : "new");

  const { state } = useAutosave({
    key,
    value: values as unknown as Record<string, unknown>,
    sync: async (v) => {
      // debounced server sync = upsert nothing; just keep alive check so errors surface
      const db = createClient();
      const { error } = await db.from("coffees").select("id").limit(1);
      if (error) throw new Error(error.message);
      void v;
    },
    onRestored: (draft) => {
      form.reset(draft as unknown as BrewInput);
    },
  });

  const dose = Number(values.doseG);
  const water = Number(values.waterG);
  const remaining = coffees.find((c) => c.id === values.coffeeId)?.remaining_weight_g;

  async function onSubmit(data: BrewInput) {
    setSubmitError(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) if (v !== undefined) fd.set(k, String(v));
    const { createBrew } = await import("@/app/actions");
    const res = await createBrew(null, fd);
    if (res.error) setSubmitError(res.error);
    else if (res.id) {
      const { localDraftStore } = await import("@/lib/drafts/local-store");
      await localDraftStore.clear(key);
      router.push(`/brews/${res.id}`);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-600">{formatRatio(dose, water)}{remaining != null && dose > remaining ? " · ⚠ exceeds remaining" : ""}</span>
        <SaveStateBadge state={state} />
      </div>
      {copyFrom ? <Card><p className="text-sm">Copied from previous brew — change only what changed.</p></Card> : null}
      <Card>
        <Label htmlFor="coffeeId">Coffee *</Label>
        <select id="coffeeId" {...form.register("coffeeId")} className="min-h-11 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base">
          <option value="">Pick a coffee…</option>
          {coffees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {form.formState.errors.coffeeId ? <p className="text-sm text-red-600">{form.formState.errors.coffeeId.message}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><Label>Dose g *</Label><Input type="number" inputMode="decimal" {...form.register("doseG")} /></div>
          <div><Label>Water g *</Label><Input type="number" inputMode="decimal" {...form.register("waterG")} /></div>
          <div><Label>Temp C</Label><Input type="number" inputMode="decimal" {...form.register("tempC")} /></div>
          <div><Label>Grind clicks</Label><Input type="number" inputMode="numeric" {...form.register("grindClicks")} /></div>
        </div>
      </Card>
      <details open>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Equipment</summary>
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Grinder</Label><Input {...form.register("grinder")} /></div>
            <div><Label>Dripper</Label><Input {...form.register("dripper")} /></div>
            <div><Label>Filter</Label><Input {...form.register("filter")} /></div>
            <div><Label>Water</Label><Input {...form.register("waterSource")} /></div>
            <div><Label>Pours</Label><Input type="number" inputMode="numeric" {...form.register("pourCount")} /></div>
            <div><Label>Time (sec)</Label><Input type="number" inputMode="numeric" {...form.register("totalTimeSec")} /></div>
          </div>
        </Card>
      </details>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Result & notes</summary>
        <Card>
          <div><Label>Final beverage g (≥150 for comp)</Label><Input type="number" inputMode="decimal" {...form.register("finalBeverageG")} /></div>
          <div className="mt-3"><Label>Notes</Label><Textarea rows={3} {...form.register("notes")} /></div>
        </Card>
      </details>
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
      <Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save brew"}</Button>
    </form>
  );
}
