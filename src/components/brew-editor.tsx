"use client";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { updateBrew, upsertObservation, upsertPours, upsertTastings } from "@/app/actions";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { BREW_NOTE_KEYS, brewEditorDefaults, planBrewSync } from "@/lib/db/brew-update";
import { completeTastingEntries, tastingRowsFromJson, tastingRowsToJson, tastingsUpdatedAt } from "@/lib/domain/tastings";
import { pourRowsFromJson, pourRowsToJson, poursUpdatedAt, completePourEntries } from "@/lib/domain/pours";
import { eyPercent, pouredTotalG, plannedDeltaG, retainedG } from "@/lib/domain/brew-water";
import { Input, Label, Select, Switch, Textarea } from "@/components/ui/controls";
import { TastingEditor } from "@/components/tasting-editor";
import { PourEditor } from "@/components/pour-editor";
import { MinutesSecondsInput } from "@/components/brew-time-input";
import { splitSeconds, toSeconds } from "@/lib/domain/brew-time";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { SaveStateBadge } from "@/components/save-state";
import { TastingDisclaimer } from "@/components/section-nav";
import { useT } from "@/lib/i18n/client";

export function BrewEditor({ userId, brew, observation, tastings, pours, sessions }: {
  userId: string;
  brew: Record<string, string | number | null>;
  observation: Record<string, string | null> | null;
  tastings: { stage: unknown; attribute: unknown; value: unknown; updated_at?: unknown }[] | null;
  pours: { sequence?: unknown; amount_g?: unknown; timing_seconds?: unknown; bloom?: unknown; pattern?: unknown; note?: unknown; updated_at?: unknown }[] | null;
  sessions: { id: string; title: string }[];
}) {
  // Baseline for dirty-slice planning: the last successfully synced snapshot,
  // starting from the pristine server-derived defaults. Captured in the state
  // initializer (runs once per mount; StrictMode re-invokes with the identical
  // value, so the assignment is idempotent).
  const syncedRef = useRef<Record<string, string | undefined> | null>(null);
  const t = useT();
  const [form, setForm] = useState<Record<string, string>>(() => {
    const d = brewEditorDefaults(
      brew as Record<string, unknown>,
      observation as Record<string, unknown> | null,
      tastings,
      pours,
    );
    syncedRef.current ??= { ...d };
    return d;
  });
  const key = draftKey(userId, "brew-edit", String(brew.id));
  // Server is authoritative once synchronized: weigh any local draft against
  // the freshest server timestamp so a stale draft can never clobber it.
  const serverUpdatedAt =
    [brew.updated_at, observation?.updated_at, tastingsUpdatedAt(tastings), poursUpdatedAt(pours)]
      .filter((v): v is string => typeof v === "string" && v !== "")
      .sort()
      .at(-1) ?? null;
  const { state, retry } = useAutosave({
    key, value: form,
    // One debounced sync for recipe + tasting + pours, but only dirty slices
    // hit the server: untouched tables are never rewritten, so brews.updated_at
    // moves only when recipe data actually changed. Independent slices run in
    // one round instead of four sequential ones; every write is an idempotent
    // full-state sync, so the first failure surfaces and a retry converges.
    sync: (v) => (async () => {
      const snapshot = v as Record<string, string>;
      const baseline = syncedRef.current ?? {};
      const plan = planBrewSync(snapshot, baseline);
      if (plan.slices.length === 0) return;
      const brewId = String(brew.id);
      const jobs: Promise<{ error?: string } | undefined>[] = [];
      if (plan.slices.includes("recipe")) {
        jobs.push(updateBrew(brewId, plan.pourCount ? { ...snapshot, pourCount: plan.pourCount } : snapshot));
      }
      if (plan.slices.includes("tastings")) {
        jobs.push(upsertTastings(brewId, completeTastingEntries(tastingRowsFromJson(snapshot.tastings))));
      }
      if (plan.slices.includes("pours")) {
        jobs.push(upsertPours(brewId, plan.pourEntries));
      }
      if (plan.slices.includes("notes")) {
        const notePatch = Object.fromEntries(BREW_NOTE_KEYS.map((k) => [k, snapshot[k]]));
        const hasContent = Object.values(notePatch).some((x) => (x ?? "") !== "");
        // Never conjure an observation row: with no existing row and nothing
        // typed, there is nothing to persist.
        if (observation != null || hasContent) {
          jobs.push(upsertObservation({ ...notePatch, brewId }));
        }
      }
      if (jobs.length === 0) {
        syncedRef.current = { ...snapshot };
        return;
      }
      const results = await Promise.all(jobs);
      const failure = results.find((r) => r?.error)?.error;
      if (failure) throw new Error(failure);
      syncedRef.current = { ...snapshot, ...(plan.pourCount ? { pourCount: plan.pourCount } : {}) };
    })(),
    serverUpdatedAt,
    // merge, don't replace: older drafts may predate newer fields.
    // Migrate legacy totalTimeSec drafts to minutes/seconds display.
    onRestored: (d) => setForm((f) => {
      const draft = d as Record<string, string>;
      const merged = { ...f, ...draft };
      if (draft.totalTimeSec && draft.brewTimeMin === undefined && draft.brewTimeSec === undefined) {
        const parts = splitSeconds(Number(draft.totalTimeSec));
        merged.brewTimeMin = parts.minutes != null ? String(parts.minutes) : "";
        merged.brewTimeSec = parts.seconds != null ? String(parts.seconds) : "";
      }
      return merged;
    }),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  // Live extraction facts for the derived readouts (same domain module as the
  // create form); missing inputs simply hide the readout.
  const pourFacts = completePourEntries(pourRowsFromJson(form.pours));
  const waterFacts = {
    water_g: form.waterG, final_beverage_g: form.finalBeverageG,
    tds_percent: form.tdsPercent, dose_g: form.doseG, bypass_g: form.bypassG,
  };
  const ey = eyPercent(waterFacts);
  const retained = retainedG(waterFacts, pourFacts);
  const pouredTotal = pouredTotalG(pourFacts);
  const plannedDelta = plannedDeltaG(form.waterG, pourFacts);

  // minutes/seconds are display facets of stored total seconds
  function setTime(which: "min" | "sec", v: string) {
    setForm((f) => {
      const m = which === "min" ? v : (f.brewTimeMin ?? "");
      const s = which === "sec" ? v : (f.brewTimeSec ?? "");
      const total = toSeconds(m === "" ? undefined : Number(m), s === "" ? undefined : Number(s));
      return { ...f, brewTimeMin: m, brewTimeSec: s, totalTimeSec: total == null ? "" : String(total) };
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink2">{t("brew.editor.hint")}</p>
        <SaveStateBadge state={state} onRetry={retry} />
      </div>
      <details open id="sec-recipe" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.recipe")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <Switch
            label={t("brew.field.selectedBeans")}
            pressed={form.selectedBeans === "true"}
            onToggle={() => set("selectedBeans", form.selectedBeans === "true" ? "false" : "true")}
            className="mt-1 w-full justify-end"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><Label>{t("brew.field.dose")}</Label><Input value={form.doseG} inputMode="decimal" onChange={(e) => set("doseG", e.target.value)} /></div>
            <div><Label>{t("brew.field.water")}</Label><Input value={form.waterG} inputMode="decimal" onChange={(e) => set("waterG", e.target.value)} /></div>
            <div><Label>{t("brew.field.grindClicks")}</Label><Input value={form.grindClicks} inputMode="numeric" onChange={(e) => set("grindClicks", e.target.value)} /></div>
            <div><Label>{t("brew.field.startTemp")}</Label><Input value={form.tempC} inputMode="decimal" onChange={(e) => set("tempC", e.target.value)} /></div>
            <div className="col-span-2 min-w-0"><Label>{t("brew.field.brewDate")}</Label><Input type="date" max={defaultBrewedDate()} value={form.brewedAt ?? ""} onChange={(e) => set("brewedAt", e.target.value)} /></div>
            <div className="col-span-2">
              <Label>{t("brew.field.brewTime")}</Label>
              <MinutesSecondsInput
                minutes={form.brewTimeMin ?? ""}
                seconds={form.brewTimeSec ?? ""}
                onMinutes={(v) => setTime("min", v)}
                onSeconds={(v) => setTime("sec", v)}
              />
            </div>
          </div>
          {sessions.length > 0 ? (
            <div className="mt-3">
              <Label htmlFor="brew-session">{t("brew.field.sessionOptional")}</Label>
              <Select id="brew-session" value={form.sessionId ?? ""} onChange={(e) => set("sessionId", e.target.value)}>
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
            <div><Label>{t("brew.field.grinder")}</Label><Input value={form.grinder ?? ""} onChange={(e) => set("grinder", e.target.value)} /></div>
            <div><Label>{t("brew.field.dripper")}</Label><Input value={form.dripper ?? ""} onChange={(e) => set("dripper", e.target.value)} /></div>
            <div><Label>{t("brew.field.filter")}</Label><Input value={form.filter ?? ""} onChange={(e) => set("filter", e.target.value)} /></div>
            <div><Label>{t("brew.field.waterSource")}</Label><Input value={form.waterSource ?? ""} onChange={(e) => set("waterSource", e.target.value)} /></div>
            <div><Label>{t("brew.field.ppm")}</Label><Input value={form.waterPpm ?? ""} inputMode="decimal" onChange={(e) => set("waterPpm", e.target.value)} /></div>
            <div className="col-span-2">
              <Label>{t("brew.field.waterNotes")}</Label><Textarea rows={2} value={form.waterNotes ?? ""} onChange={(e) => set("waterNotes", e.target.value)} />
            </div>
            <div><Label>{t("brew.field.thermalShock")}</Label><Input value={form.thermalShock ?? ""} onChange={(e) => set("thermalShock", e.target.value)} /></div>
            <div>
              <Label>{t("brew.field.bypassG")}</Label>
              <Input value={form.bypassG ?? ""} inputMode="decimal" onChange={(e) => set("bypassG", e.target.value)} />
              <p className="mt-1 text-[11px] text-ink3">{t("brew.field.bypassGHint")}</p>
            </div>
            <Switch
              label={t("brew.field.lilydrip")}
              pressed={form.lilydrip === "true"}
              onToggle={() => set("lilydrip", form.lilydrip === "true" ? "false" : "true")}
            />
            <Switch
              label={t("brew.field.harioSwitch")}
              pressed={form.harioSwitch === "true"}
              onToggle={() => set("harioSwitch", form.harioSwitch === "true" ? "false" : "true")}
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
            rows={pourRowsFromJson(form.pours)}
            legacyCount={brew.pour_count != null && brew.pour_count !== "" ? Number(brew.pour_count) : null}
            switchOn={form.harioSwitch === "true"}
            brewTemp={form.tempC ?? ""}
            onChange={(rows) => set("pours", pourRowsToJson(rows))}
          />
          {pouredTotal != null && Number.isFinite(Number(form.waterG)) ? (
            <p className="tnum mt-2 text-xs text-ink2" aria-live="polite">
              {t("brew.pouredLine.prefix")}{pouredTotal}{t("brew.pouredLine.middle")}{form.waterG}{t("brew.pouredLine.suffix")}
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
          <Label htmlFor="brew-expected" className="sr-only">{t("brew.field.expected")}</Label>
          <Textarea id="brew-expected" rows={2} placeholder={t("brew.field.expectedPlaceholder")} value={form.expectedText ?? ""} onChange={(e) => set("expectedText", e.target.value)} />
        </div>
      </details>
      <details open id="sec-result" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.result")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("brew.field.finalBeverage")}</Label><Input value={form.finalBeverageG ?? ""} inputMode="decimal" onChange={(e) => set("finalBeverageG", e.target.value)} /></div>
            <div>
              <Label>{t("brew.field.tds")}</Label>
              <Input value={form.tdsPercent ?? ""} inputMode="decimal" onChange={(e) => set("tdsPercent", e.target.value)} />
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
          <div className="mt-3"><Label>{t("brew.field.brewNotes")}</Label><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
      </details>
      <details open id="sec-tasting" className="group overflow-hidden rounded-[10px] border border-line bg-card scroll-mt-14">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b border-transparent px-4 py-2.5 transition-colors hover:bg-paper active:bg-paper group-open:border-line [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">{t("brew.section.tasting")}</h2>
          <ChevronDown size={18} aria-hidden className="shrink-0 text-ink3 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="p-4">
          <TastingDisclaimer />
          <div className="mt-2">
          <TastingEditor
            rows={tastingRowsFromJson(form.tastings)}
            onChange={(rows) => set("tastings", tastingRowsToJson(rows))}
            notes={{ hot: form.hotNotes ?? "", warm: form.warmNotes ?? "", cold: form.coldNotes ?? "" }}
            onNotes={(stage, value) => set(`${stage}Notes`, value)}
          />
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-base font-medium">{t("brew.field.overallNotes")}</h3>
            <Label htmlFor="obs-overall" className="sr-only">{t("brew.field.overallNotes")}</Label>
            <Textarea id="obs-overall" rows={2} className="mt-1" value={form.freeformNotes ?? ""} onChange={(e) => set("freeformNotes", e.target.value)} />
          </div>
          </div>
        </div>
      </details>
    </div>
  );
}
