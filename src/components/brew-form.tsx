"use client";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { TriangleAlert } from "lucide-react";
import { newBrewFormSchema, type NewBrewFormInput } from "@/lib/validation/schemas";
import { splitSeconds } from "@/lib/domain/brew-time";
import { defaultBrewedDate, formatReceived } from "@/lib/domain/brew-date";
import { inheritedFieldNames, recipeStartingValues } from "@/lib/domain/recipe-start";
import type { PourFact } from "@/lib/domain/pours";
import { pourRowsFromJson, pourRowsToJson, completePourEntries, pourSequenceInvalid } from "@/lib/domain/pours";
import { eyPercent, pouredTotalG, plannedDeltaG, retainedG } from "@/lib/domain/brew-water";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { Button, FieldError, Input, Label, Select, Switch, Textarea } from "@/components/ui/controls";
import { MinutesSecondsInput } from "@/components/brew-time-input";
import { TastingEditor } from "@/components/tasting-editor";
import { PourEditor } from "@/components/pour-editor";
import { tastingRowsFromJson, tastingRowsToJson } from "@/lib/domain/tastings";

import { SectionNav, TastingDisclaimer } from "@/components/section-nav";
import { formatRatio } from "@/lib/domain/ratio";
import { useLocale, useT } from "@/lib/i18n/client";
import { errorText } from "@/lib/i18n/errors";
import { cn } from "@/components/ui/utils";
import { partitionCoffeesForBrewSelect } from "@/lib/domain/inventory";

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

export function BrewForm({ userId, coffees, sessions, initialCoffeeId, recipeFrom, recipePoursFrom }: Props) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
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
  // Validation messages are stable codes (schemas.ts msg()); the dictionaries
  // hold the only user-facing wording. No error -> null, so FieldError stays
  // hidden: the generic fallback must surface only under an actual error.
  const err = (name: keyof NewBrewFormInput) => {
    const message = form.formState.errors[name]?.message;
    return typeof message === "string" ? errorText(message, t) : null;
  };
  // ponytail: context comes from the already-loaded list — selecting a coffee
  // never fires a request.
  const selectedCoffee = coffees.find((c) => c.id === values.coffeeId);
  const remaining = selectedCoffee?.remaining_weight_g;
  const depleted = remaining === 0;
  const overRemaining = remaining != null && dose > remaining;
  // legacy manual count from the copy source, shown until structured
  // pours take over the counter. Never editable, never invented.
  const copyLegacyPours = (() => {
    if (pourRowsFromJson(values.pours).length > 0 || recipeFrom == null) return null;
    const n = Number((recipeFrom as { pour_count?: unknown }).pour_count);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  // Live extraction facts for the derived readouts. All math lives in the
  // brew-water domain module; missing inputs simply hide the readout.
  const pourFacts = completePourEntries(pourRowsFromJson(values.pours));
  const waterFacts = {
    water_g: values.waterG, final_beverage_g: values.finalBeverageG,
    tds_percent: values.tdsPercent, dose_g: values.doseG, bypass_g: values.bypassG,
  };
  const ey = eyPercent(waterFacts);
  const retained = retainedG(waterFacts, pourFacts);
  const pouredTotal = pouredTotalG(pourFacts);
  const plannedDelta = plannedDeltaG(values.waterG, pourFacts);

  async function onSubmit(data: NewBrewFormInput) {
    setSubmitError(null);
    // chronological pour rule: an out-of-order sequence blocks submission;
    // the offending pour is flagged inline in the editor
    if (pourSequenceInvalid(pourRowsFromJson(data.pours)).some(Boolean)) {
      setSubmitError(t("pours.error.sequence"));
      return;
    }
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) if (v !== undefined) fd.set(k, String(v));
    // brewTimeMin/Sec ride along; the action normalizes to total_time_sec
    const { createBrew } = await import("@/app/actions");
    const res = await createBrew(null, fd);
    // action failures travel as stable codes; translate at the boundary so
    // the user never sees "save.failed" verbatim
    if (res.error) setSubmitError(errorText(res.error, t));
    else if (res.id) {
      const { localDraftStore } = await import("@/lib/drafts/local-store");
      await localDraftStore.clear(key);
      router.push(`/brews/${res.id}`);
    }
  }

  // header numbers and ratio reflect actual brew water; planned stays explicit
  // when structured pours differ from the planned recipe water
  const actualWater = pouredTotal != null && Number.isFinite(pouredTotal) ? pouredTotal : water;
  const ratioLabel = formatRatio(dose, actualWater);
  const showRatio = ratioLabel !== "-";
  const ratioDiffers = pouredTotal != null && Number.isFinite(water) && water !== pouredTotal;

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
            {Number.isFinite(dose) ? dose : "?"} g → {Number.isFinite(actualWater) ? actualWater : "?"} g
            {ratioDiffers ? ` · ${water}${t("brew.pouredLine.suffix")}` : ""}
          </div>
          {overRemaining ? (
            <p className="mt-1 flex min-h-8 items-center gap-1 text-sm text-ember">
              <TriangleAlert size={16} aria-hidden />
              {t("brew.overRemaining")}
            </p>
          ) : null}
        </div>

      </div>
      {recipeFrom ? <div className="rounded-[10px] bg-note px-3 py-2 text-sm text-ink2">{t("brew.copy.card")}</div> : null}
      <SectionNav items={[
        { id: "sec-recipe", label: t("brew.section.recipe") },
        { id: "sec-equipment", label: t("brew.section.equipment") },
        { id: "sec-pours", label: t("brew.section.pours") },
        { id: "sec-expected", label: t("brew.section.expected") },
        { id: "sec-result", label: t("brew.section.result") },
        { id: "sec-tasting", label: t("brew.section.tasting") },
      ]} />
      <details open id="sec-recipe" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.recipe")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
        <Label htmlFor="coffeeId">{t("brew.field.coffee")} *</Label>
        <Select id="coffeeId" error={!!form.formState.errors.coffeeId} className={inh("coffeeId")} {...form.register("coffeeId")}>
          <option value="">{t("brew.pickCoffee")}</option>
          {(() => {
            const { available, depleted } = partitionCoffeesForBrewSelect(coffees);
            return (
              <>
                {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {depleted.length > 0 ? (
                  <optgroup label={t("coffee.depletedGroup")}>
                    {depleted.map((c) => <option key={c.id} value={c.id}>{c.name} · ~0 g</option>)}
                  </optgroup>
                ) : null}
              </>
            );
          })()}
        </Select>
        <FieldError>{err("coffeeId")}</FieldError>
        {selectedCoffee ? (
          <>
          <p className="tnum mt-1 text-sm text-ink2">
            {[selectedCoffee.origin, selectedCoffee.process].filter(Boolean).join(" · ") || t("coffee.metaUnknown")}
            {" · "}~{selectedCoffee.remaining_weight_g ?? "?"} g {selectedCoffee.remaining_weight_g === 1 ? t("coffee.remainingOne") : t("coffee.remainingMany")}
            {" · "}{formatReceived(selectedCoffee.received_date, locale)}
          </p>
          {depleted ? (
            <p className="mt-1 flex min-h-8 items-center gap-1 text-sm text-ember" role="alert">
              <TriangleAlert size={16} aria-hidden />
              {t("brew.depleted")}
            </p>
          ) : null}
          </>
        ) : null}
        <Switch
          label={t("brew.field.selectedBeans")}
          pressed={values.selectedBeans === true}
          onToggle={() => form.setValue("selectedBeans", !(values.selectedBeans === true), { shouldDirty: true })}
          className="mt-2 w-full justify-end"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><Label>{t("brew.field.dose")} *</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.doseG} className={inh("doseG")} {...form.register("doseG")} /><FieldError>{err("doseG")}</FieldError></div>
          <div><Label>{t("brew.field.water")} *</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.waterG} className={inh("waterG")} {...form.register("waterG")} /><FieldError>{err("waterG")}</FieldError></div>
          <div><Label>{t("brew.field.grindClicks")}</Label><Input type="number" inputMode="numeric" error={!!form.formState.errors.grindClicks} className={inh("grindClicks")} {...form.register("grindClicks")} /><FieldError>{err("grindClicks")}</FieldError></div>
          <div><Label>{t("brew.field.startTemp")}</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.tempC} className={inh("tempC")} {...form.register("tempC")} /><FieldError>{err("tempC")}</FieldError></div>
          <div className="col-span-2 min-w-0">
            <Label>{t("brew.field.brewDate")}</Label><Input type="date" max={defaultBrewedDate()} error={!!form.formState.errors.brewedAt} {...form.register("brewedAt")} />
            <FieldError>{err("brewedAt")}</FieldError>
          </div>
          <div className="col-span-2">
            <Label>{t("brew.field.brewTime")}</Label>
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
            <Label htmlFor="sessionId">{t("brew.field.sessionOptional")}</Label>
            <Select id="sessionId" error={!!form.formState.errors.sessionId} className={inh("sessionId")} {...form.register("sessionId")}>
              <option value="">{t("brew.warning.noSession")}</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </div>
        ) : null}
        </div>
      </details>
      <details open id="sec-equipment" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.equipment")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("brew.field.grinder")}</Label><Input error={!!form.formState.errors.grinder} className={inh("grinder")} {...form.register("grinder")} /></div>
            <div><Label>{t("brew.field.dripper")}</Label><Input error={!!form.formState.errors.dripper} className={inh("dripper")} {...form.register("dripper")} /></div>
            <div><Label>{t("brew.field.filter")}</Label><Input error={!!form.formState.errors.filter} className={inh("filter")} {...form.register("filter")} /></div>
            <div><Label>{t("brew.field.waterSource")}</Label><Input error={!!form.formState.errors.waterSource} className={inh("waterSource")} {...form.register("waterSource")} /></div>
            <div><Label>{t("brew.field.ppm")}</Label><Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.waterPpm} className={inh("waterPpm")} {...form.register("waterPpm")} /><FieldError>{err("waterPpm")}</FieldError></div>
            <div className="col-span-2">
              <Label>{t("brew.field.waterNotes")}</Label><Textarea rows={2} error={!!form.formState.errors.waterNotes} className={inh("waterNotes")} {...form.register("waterNotes")} />
            </div>
            <div><Label>{t("brew.field.thermalShock")}</Label><Input error={!!form.formState.errors.thermalShock} className={inh("thermalShock")} {...form.register("thermalShock")} /></div>
            <div>
              <Label>{t("brew.field.bypassG")}</Label>
              <Input type="number" step="any" inputMode="decimal" min="0" error={!!form.formState.errors.bypassG} {...form.register("bypassG")} />
              <p className="mt-1 text-[11px] text-ink3">{t("brew.field.bypassGHint")}</p>
            </div>
            {/* legacy bypass text keeps riding copy sources untouched */}
            <input type="hidden" {...form.register("bypass")} />
            <Switch
              label={t("brew.field.lilydrip")}
              pressed={values.lilydrip === true}
              onToggle={() => form.setValue("lilydrip", !(values.lilydrip === true), { shouldDirty: true })}
            />
            <Switch
              label={t("brew.field.harioSwitch")}
              pressed={values.harioSwitch === true}
              onToggle={() => form.setValue("harioSwitch", !(values.harioSwitch === true), { shouldDirty: true })}
            />
          </div>
        </div>
      </details>
      <details open id="sec-pours" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.poursOptional")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <PourEditor
            rows={pourRowsFromJson(values.pours)}
            legacyCount={copyLegacyPours}
            switchOn={values.harioSwitch === true}
            brewTemp={values.tempC != null && values.tempC !== "" ? String(values.tempC) : null}
            onChange={(rows) => form.setValue("pours", pourRowsToJson(rows), { shouldDirty: true })}
          />
          {pouredTotal != null && Number.isFinite(Number(values.waterG)) ? (
            <p className="tnum mt-2 text-xs text-ink2" aria-live="polite">
              {t("brew.pouredLine.prefix")}{pouredTotal}{t("brew.pouredLine.middle")}{values.waterG}{t("brew.pouredLine.suffix")}
              {plannedDelta != null && plannedDelta !== 0 ? ` · ${plannedDelta > 0 ? "+" : ""}${plannedDelta}${t("brew.pouredDelta.suffix")}` : ""}
            </p>
          ) : null}
        </div>
      </details>
      <details open id="sec-expected" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.field.expected")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <Label htmlFor="expectedText" className="sr-only">{t("brew.field.expected")}</Label>
          <Textarea id="expectedText" rows={2} placeholder={t("brew.field.expectedPlaceholder")} error={!!form.formState.errors.expectedText} {...form.register("expectedText")} />
        </div>
      </details>
      <details open id="sec-result" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.result")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("brew.field.finalBeverage")}</Label>
              <Input type="number" step="any" inputMode="decimal" error={!!form.formState.errors.finalBeverageG} {...form.register("finalBeverageG")} />
            </div>
            <div>
              <Label>{t("brew.field.tds")}</Label>
              <Input type="number" step="any" inputMode="decimal" min="0" max="30" error={!!form.formState.errors.tdsPercent} {...form.register("tdsPercent")} />
              <p className="mt-1 text-[11px] text-ink3">{t("brew.field.tdsHint")}</p>
            </div>
          </div>
          {ey != null || retained != null ? (
            <div className="tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2" aria-live="polite">
              {ey != null ? (
                <span>{t("brew.field.ey")}: {ey}</span>
              ) : null}
              {retained != null ? (
                <span>{t("brew.field.retention")}: {retained}</span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3"><Label>{t("brew.field.brewNotes")}</Label><Textarea rows={2} error={!!form.formState.errors.notes} {...form.register("notes")} /></div>
        </div>
      </details>
      <details open id="sec-tasting" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.tasting")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <TastingDisclaimer />
          <TastingEditor
            rows={tastingRowsFromJson(values.tastings)}
            onChange={(rows) => form.setValue("tastings", tastingRowsToJson(rows), { shouldDirty: true })}
            notes={{ hot: values.hotNotes ?? "", warm: values.warmNotes ?? "", cold: values.coldNotes ?? "" }}
            onNotes={(stage, v) => form.setValue(`${stage}Notes`, v, { shouldDirty: true })}
          />
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-base font-medium">{t("brew.field.overallNotes")}</h3>
            <Textarea rows={2} className="mt-1" aria-label={t("brew.field.overallNotes")} error={!!form.formState.errors.freeformNotes} {...form.register("freeformNotes")} />
          </div>
        </div>
      </details>
      {submitError ? <p role="alert" className="text-sm text-ember">{submitError}</p> : null}
      <Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? t("brew.saving") : t("brew.save")}</Button>
    </form>
  );
}
