"use client";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { newBrewFormSchema, type NewBrewFormInput } from "@/lib/validation/schemas";
import { splitSeconds } from "@/lib/domain/brew-time";
import { defaultBrewedDate, formatReceived } from "@/lib/domain/brew-date";
import { inheritedFieldNames, recipeStartingValues } from "@/lib/domain/recipe-start";
import type { PourFact } from "@/lib/domain/pours";
import { pourRowsFromJson, pourRowsToJson } from "@/lib/domain/pours";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { Button, Card, FieldError, Input, Label, SectionHeader, Select, Textarea, Toggle } from "@/components/ui/controls";
import { MinutesSecondsInput } from "@/components/brew-time-input";
import { TastingEditor } from "@/components/tasting-editor";
import { PourEditor } from "@/components/pour-editor";
import { tastingRowsFromJson, tastingRowsToJson } from "@/lib/domain/tastings";

import { SectionNav, TastingDisclaimer } from "@/components/section-nav";
import { formatRatio } from "@/lib/domain/ratio";
import { cn } from "@/components/ui/utils";

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
  recipePoursFrom?: PourFact[] | null;
};

function defaults(recipeFrom?: Record<string, unknown> | null, coffeeId?: string, pours?: PourFact[] | null): Partial<NewBrewFormInput> {
  return recipeStartingValues(
    (recipeFrom ?? null) as Record<string, string | number | null | undefined> | null,
    coffeeId ?? "",
    pours ?? null,
  );
}

export function BrewForm({ userId, coffees, sessions, minBeverageG, initialCoffeeId, recipeFrom, recipePoursFrom }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<NewBrewFormInput>({
    // ponytail: zodResolver only here (complex form); simple forms use server actions
    resolver: zodResolver(newBrewFormSchema) as unknown as Resolver<NewBrewFormInput>,
    defaultValues: defaults(recipeFrom, initialCoffeeId, recipePoursFrom),
  });
  // react-hook-form sits outside the compiler's memoization model on purpose:
  // this form re-renders per keystroke by design, so there is nothing to memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const values = form.watch();
  const key = draftKey(userId, "brew", recipeFrom ? `copy-${(recipeFrom as { id?: string }).id ?? "new"}` : "new");
  // Inherited-field tint applies only to fields that actually carried a value
  // from the previous brew. An empty copy source must not tint every input.
  const inherited = inheritedFieldNames(
    (recipeFrom ?? null) as Record<string, string | number | null | undefined> | null,
    recipePoursFrom,
  );

  // New Brew uses the explicit Save button; local drafts still recover on
  // reload, but no autosave status badge is shown because there is no server
  // row to sync yet.
  useAutosave({
    key,
    value: values as unknown as Record<string, unknown>,
    // ponytail: no server row exists yet, so there is nothing to sync -
    // the local draft IS the persistence until submit. Zero requests by design.
    sync: () => Promise.resolve(),
    // All New Brew creation flows share the same 4-hour draft expiry, so a
    // stale copy draft can never resurrect and override fresh initialization
    // values. Within the window, reloads still recover the active draft.
    draftMaxAgeMs: 4 * 60 * 60 * 1000,
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
  // inherited-field tint: values actually carried from the previous brew read
  // paper-tinted until edited. Empty copy sources must not tint every input.
  const dirty = form.formState.dirtyFields;
  const inh = (name: keyof NewBrewFormInput) =>
    inherited.has(name) && !dirty[name] ? "bg-paper" : "";
  // ponytail: context comes from the already-loaded list — selecting a coffee
  // never fires a request.
  const selectedCoffee = coffees.find((c) => c.id === values.coffeeId);
  const remaining = selectedCoffee?.remaining_weight_g;
  const overRemaining = remaining != null && dose > remaining;
  // legacy manual count from the copy source, shown until structured
  // pours take over the counter. Never editable, never invented.
  const copyLegacyPours = (() => {
    if (pourRowsFromJson(values.pours).length > 0 || recipeFrom == null) return null;
    const n = Number((recipeFrom as { pour_count?: unknown }).pour_count);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
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

  const ratioLabel = formatRatio(dose, water);
  const showRatio = ratioLabel !== "-";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          {showRatio ? (
            <div className="tnum font-display text-3xl leading-none" aria-live="polite">
              {ratioLabel}
            </div>
          ) : null}
          <div className={cn("tnum text-xs text-ink2", showRatio && "mt-1")}>
            {Number.isFinite(dose) ? dose : "?"} g → {Number.isFinite(water) ? water : "?"} g
          </div>
          {overRemaining ? (
            <p className="mt-1 flex min-h-8 items-center gap-1 text-sm text-ember">
              <TriangleAlert size={16} aria-hidden />
              Over remaining - advisory only, saves anyway.
            </p>
          ) : null}
        </div>

      </div>
      {recipeFrom ? <Card><p className="text-sm text-ink2">Starting from the last recipe - change only what changed. Tinted fields are inherited; editing one returns it to normal.</p></Card> : null}
      <SectionNav items={[
        { id: "sec-recipe", label: "Recipe" },
        { id: "sec-equipment", label: "Equipment" },
        { id: "sec-pours", label: "Pours" },
        { id: "sec-expected", label: "Expected" },
        { id: "sec-result", label: "Result" },
        { id: "sec-tasting", label: "Tasting" },
      ]} />
      <div>
        <SectionHeader>Recipe</SectionHeader>
        <Card id="sec-recipe" className="mt-2 scroll-mt-14">
        <Label htmlFor="coffeeId">Coffee *</Label>
        <Select id="coffeeId" error={!!form.formState.errors.coffeeId} className={inh("coffeeId")} {...form.register("coffeeId")}>
          <option value="">Pick a coffee…</option>
          {coffees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <FieldError>{form.formState.errors.coffeeId?.message}</FieldError>
        {selectedCoffee ? (
          <p className="tnum mt-1 text-sm text-ink2">
            {[selectedCoffee.origin, selectedCoffee.process].filter(Boolean).join(" · ") || "origin/process unknown"}
            {" · "}~{selectedCoffee.remaining_weight_g ?? "?"} g remaining
            {" · "}{formatReceived(selectedCoffee.received_date)}
          </p>
        ) : null}
        <Toggle
          label="Selected beans"
          pressed={values.selectedBeans === true}
          onToggle={() => form.setValue("selectedBeans", !(values.selectedBeans === true), { shouldDirty: true })}
          className="mt-2 w-full"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><Label>Dose g *</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.doseG} className={inh("doseG")} {...form.register("doseG")} /></div>
          <div><Label>Water g *</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.waterG} className={inh("waterG")} {...form.register("waterG")} /></div>
          <div><Label>Grind clicks</Label><Input type="number" inputMode="numeric" error={!!form.formState.errors.grindClicks} className={inh("grindClicks")} {...form.register("grindClicks")} /></div>
          <div><Label>Starting temp °C</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.tempC} className={inh("tempC")} {...form.register("tempC")} /></div>
          <div className="col-span-2">
            <Label>Brew date</Label><Input type="date" max={defaultBrewedDate()} error={!!form.formState.errors.brewedAt} {...form.register("brewedAt")} />
          </div>
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
        {sessions.length > 0 ? (
          <div className="mt-3">
            <Label htmlFor="sessionId">Session (optional)</Label>
            <Select id="sessionId" error={!!form.formState.errors.sessionId} className={inh("sessionId")} {...form.register("sessionId")}>
              <option value="">No session</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </div>
        ) : null}
      </Card>
      </div>
      <details open id="sec-equipment" className="scroll-mt-14">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Equipment</summary>
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Grinder</Label><Input error={!!form.formState.errors.grinder} className={inh("grinder")} {...form.register("grinder")} /></div>
            <div><Label>Dripper</Label><Input error={!!form.formState.errors.dripper} className={inh("dripper")} {...form.register("dripper")} /></div>
            <div><Label>Filter</Label><Input error={!!form.formState.errors.filter} className={inh("filter")} {...form.register("filter")} /></div>
            <div><Label>Water</Label><Input error={!!form.formState.errors.waterSource} className={inh("waterSource")} {...form.register("waterSource")} /></div>
            <div><Label>Water brand</Label><Input error={!!form.formState.errors.waterBrand} className={inh("waterBrand")} {...form.register("waterBrand")} /></div>
            <div><Label>PPM</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.waterPpm} className={inh("waterPpm")} {...form.register("waterPpm")} /></div>
            <div className="col-span-2">
              <Label>Water description</Label><Input error={!!form.formState.errors.waterDescription} className={inh("waterDescription")} {...form.register("waterDescription")} />
            </div>
            <div className="col-span-2">
              <Label>Water notes</Label><Textarea rows={2} error={!!form.formState.errors.waterNotes} className={inh("waterNotes")} {...form.register("waterNotes")} />
            </div>
            <div><Label>Thermal shock</Label><Input error={!!form.formState.errors.thermalShock} className={inh("thermalShock")} {...form.register("thermalShock")} /></div>
            <div><Label>Bypass</Label><Input error={!!form.formState.errors.bypass} className={inh("bypass")} {...form.register("bypass")} /></div>
            <Toggle
              label="LilyDrip"
              pressed={values.lilydrip === true}
              onToggle={() => form.setValue("lilydrip", !(values.lilydrip === true), { shouldDirty: true })}
            />
            <Toggle
              label="Hario Switch"
              pressed={values.harioSwitch === true}
              onToggle={() => form.setValue("harioSwitch", !(values.harioSwitch === true), { shouldDirty: true })}
            />
          </div>
        </Card>
      </details>
      <details open id="sec-pours" className="scroll-mt-14">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Pours (optional)</summary>
        <Card>
          <PourEditor
            rows={pourRowsFromJson(values.pours)}
            legacyCount={copyLegacyPours}
            switchOn={values.harioSwitch === true}
            brewTemp={values.tempC != null && values.tempC !== "" ? String(values.tempC) : null}
            onChange={(rows) => form.setValue("pours", pourRowsToJson(rows), { shouldDirty: true })}
          />
        </Card>
      </details>
      <Card id="sec-expected" className="scroll-mt-14">
        <Label htmlFor="expectedText">Expected from this brew</Label>
        <Textarea id="expectedText" rows={2} className="mt-1" placeholder="What do you expect before tasting?" error={!!form.formState.errors.expectedText} {...form.register("expectedText")} />
        <p className="mt-1 text-xs text-ink2">Fresh expectation for this brew only - never copied to the next brew.</p>
      </Card>
      <details id="sec-result" className="scroll-mt-14">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Result</summary>
        <Card>
          <div>
            <Label>
              Final beverage g{minBeverageG != null ? ` (target ≥ ${minBeverageG} g)` : ""}
            </Label>
            <Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.finalBeverageG} {...form.register("finalBeverageG")} />
            {belowTarget ? (
              <p className="mt-1 text-sm text-ember">Below the {minBeverageG} g target - saves anyway.</p>
            ) : null}
          </div>
          <div className="mt-3"><Label>Brew notes</Label><Textarea rows={2} error={!!form.formState.errors.notes} {...form.register("notes")} /></div>
        </Card>
      </details>
      <details open id="sec-tasting" className="scroll-mt-14">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Tasting</summary>
        <Card>
          <TastingDisclaimer />
          <TastingEditor
            rows={tastingRowsFromJson(values.tastings)}
            onChange={(rows) => form.setValue("tastings", tastingRowsToJson(rows), { shouldDirty: true })}
            notes={{ hot: values.hotNotes ?? "", warm: values.warmNotes ?? "", cold: values.coldNotes ?? "" }}
            onNotes={(stage, v) => form.setValue(`${stage}Notes`, v, { shouldDirty: true })}
          />
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-base font-medium">Overall notes</h3>
            <Textarea rows={2} className="mt-1" aria-label="Overall notes" error={!!form.formState.errors.freeformNotes} {...form.register("freeformNotes")} />
          </div>
        </Card>
      </details>
      {submitError ? <p role="alert" className="text-sm text-ember">{submitError}</p> : null}
      <Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving brew…" : "Save brew"}</Button>
    </form>
  );
}
