"use client";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { newBrewFormSchema, type NewBrewFormInput } from "@/lib/validation/schemas";
import { splitSeconds } from "@/lib/domain/brew-time";
import { defaultBrewedDate, formatReceived } from "@/lib/domain/brew-date";
import { recipeStartingValues } from "@/lib/domain/recipe-start";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { MinutesSecondsInput } from "@/components/brew-time-input";
import { SaveStateBadge } from "@/components/save-state";
import { formatRatio } from "@/lib/domain/ratio";

type CoffeeOption = {
  id: string;
  name: string;
  origin: string | null;
  process: string | null;
  remaining_weight_g: number | null;
  received_date: string | null;
};

type Props = {
  userId: string;
  coffees: CoffeeOption[];
  sessions: { id: string; title: string }[];
  minBeverageG: number | null;
  initialCoffeeId?: string;
  recipeFrom?: Record<string, unknown> | null;
};

function defaults(recipeFrom?: Record<string, unknown> | null, coffeeId?: string): NewBrewFormInput {
  return recipeStartingValues(
    (recipeFrom ?? null) as Record<string, string | number | undefined> | null,
    coffeeId ?? "",
  );
}

export function BrewForm({ userId, coffees, sessions, minBeverageG, initialCoffeeId, recipeFrom }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<NewBrewFormInput>({
    // ponytail: zodResolver only here (complex form); simple forms use server actions
    resolver: zodResolver(newBrewFormSchema) as unknown as Resolver<NewBrewFormInput>,
    defaultValues: defaults(recipeFrom, initialCoffeeId),
  });
  const values = form.watch();
  const key = draftKey(userId, "brew", recipeFrom ? `copy-${(recipeFrom as { id?: string }).id ?? "new"}` : "new");

  const { state, retry } = useAutosave({
    key,
    value: values as unknown as Record<string, unknown>,
    // ponytail: no server row exists yet, so there is nothing to sync —
    // the local draft IS the persistence until submit. Zero requests by design.
    sync: () => Promise.resolve(),
    onRestored: (draft) => {
      const d = draft as unknown as Record<string, string | number | undefined>;
      const reset = { ...(d as unknown as NewBrewFormInput) };
      // migrate legacy totalTimeSec drafts to minutes/seconds display
      if (d.totalTimeSec != null && d.brewTimeMin == null && d.brewTimeSec == null) {
        const t = splitSeconds(Number(d.totalTimeSec));
        reset.brewTimeMin = t.minutes;
        reset.brewTimeSec = t.seconds;
      }
      // legacy drafts predate the brew date: a new preparation starts today
      if (reset.brewedAt == null) reset.brewedAt = defaultBrewedDate();
      form.reset(reset);
    },
  });

  const dose = Number(values.doseG);
  const water = Number(values.waterG);
  // ponytail: context comes from the already-loaded list — selecting a coffee
  // never fires a request.
  const selectedCoffee = coffees.find((c) => c.id === values.coffeeId);
  const remaining = selectedCoffee?.remaining_weight_g;
  const overRemaining = remaining != null && dose > remaining;
  // guidance only: entering a value is optional, and below-target still saves
  const bevRaw = values.finalBeverageG;
  const bev = bevRaw === "" || bevRaw == null ? NaN : Number(bevRaw);
  const belowTarget = minBeverageG != null && Number.isFinite(bev) && bev < minBeverageG;

  async function onSubmit(data: NewBrewFormInput) {
    setSubmitError(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) if (v !== undefined) fd.set(k, String(v));
    // brewTimeMin/Sec ride along; the action normalizes to total_time_sec
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="tnum font-display text-5xl leading-none" aria-live="polite">
            {formatRatio(dose, water)}
          </div>
          <div className="tnum mt-1 text-sm text-ink2">
            {Number.isFinite(dose) ? dose : "?"} g / {Number.isFinite(water) ? water : "?"} g
          </div>
          {overRemaining ? (
            <p className="mt-1 flex min-h-8 items-center gap-1 text-sm text-ember">
              <TriangleAlert size={16} aria-hidden /> Over remaining — advisory only, saves anyway.
            </p>
          ) : null}
        </div>
        <SaveStateBadge state={state} onRetry={retry} />
      </div>
      {recipeFrom ? <Card><p className="text-sm text-ink2">Starting from the last recipe — change only what changed.</p></Card> : null}
      <Card>
        <Label htmlFor="coffeeId">Coffee *</Label>
        <Select id="coffeeId" {...form.register("coffeeId")}>
          <option value="">Pick a coffee…</option>
          {coffees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {form.formState.errors.coffeeId ? <p role="alert" className="mt-1 text-sm text-ember">{form.formState.errors.coffeeId.message}</p> : null}
        {selectedCoffee ? (
          <p className="tnum mt-1 text-sm text-ink2">
            {[selectedCoffee.origin, selectedCoffee.process].filter(Boolean).join(" · ") || "origin/process unknown"}
            {" · "}~{selectedCoffee.remaining_weight_g ?? "?"} g remaining
            {" · "}{formatReceived(selectedCoffee.received_date)}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><Label>Dose g *</Label><Input type="number" inputMode="decimal" {...form.register("doseG")} /></div>
          <div><Label>Water g *</Label><Input type="number" inputMode="decimal" {...form.register("waterG")} /></div>
          <div><Label>Brew date</Label><Input type="date" {...form.register("brewedAt")} /></div>
          <div><Label>Temp C</Label><Input type="number" inputMode="decimal" {...form.register("tempC")} /></div>
          <div><Label>Grind clicks</Label><Input type="number" inputMode="numeric" {...form.register("grindClicks")} /></div>
        </div>
        {sessions.length > 0 ? (
          <div className="mt-3">
            <Label htmlFor="sessionId">Session (optional)</Label>
            <Select id="sessionId" {...form.register("sessionId")}>
              <option value="">No session</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </div>
        ) : null}
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
            <div className="col-span-2">
              <Label>Brew time</Label>
              <MinutesSecondsInput
                minutes={String(values.brewTimeMin ?? "")}
                seconds={String(values.brewTimeSec ?? "")}
                onMinutes={(v) => form.setValue("brewTimeMin", v === "" ? undefined : Number(v), { shouldDirty: true })}
                onSeconds={(v) => form.setValue("brewTimeSec", v === "" ? undefined : Number(v), { shouldDirty: true })}
              />
            </div>
          </div>
        </Card>
      </details>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Result & notes</summary>
        <Card>
          <div>
            <Label>
              Final beverage g{minBeverageG != null ? ` (target ≥ ${minBeverageG} g)` : ""}
            </Label>
            <Input type="number" inputMode="decimal" {...form.register("finalBeverageG")} />
            {belowTarget ? (
              <p className="mt-1 text-sm text-ember">Below the {minBeverageG} g target — saves anyway.</p>
            ) : null}
          </div>
          <div className="mt-3"><Label>Hot notes</Label><Textarea rows={2} {...form.register("hotNotes")} /></div>
          <div className="mt-3"><Label>Warm notes</Label><Textarea rows={2} {...form.register("warmNotes")} /></div>
          <div className="mt-3"><Label>Cold notes</Label><Textarea rows={2} {...form.register("coldNotes")} /></div>
          <div className="mt-3"><Label>Tasting notes</Label><Textarea rows={2} {...form.register("freeformNotes")} /></div>
          <div className="mt-3"><Label>Brew notes</Label><Textarea rows={2} {...form.register("notes")} /></div>
        </Card>
      </details>
      {submitError ? <p role="alert" className="text-sm text-ember">{submitError}</p> : null}
      <Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving brew…" : "Save brew"}</Button>
    </form>
  );
}
