"use client";
import { useRef, useState } from "react";
import { updateBrew, upsertObservation, upsertPours, upsertTastings } from "@/app/actions";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { BREW_NOTE_KEYS, brewEditorDefaults, planBrewSync } from "@/lib/db/brew-update";
import { completeTastingEntries, tastingRowsFromJson, tastingRowsToJson, tastingsUpdatedAt } from "@/lib/domain/tastings";
import { pourRowsFromJson, pourRowsToJson, poursUpdatedAt } from "@/lib/domain/pours";
import { Card, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { TastingEditor } from "@/components/tasting-editor";
import { PourEditor } from "@/components/pour-editor";
import { MinutesSecondsInput } from "@/components/brew-time-input";
import { splitSeconds, toSeconds } from "@/lib/domain/brew-time";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { SaveStateBadge } from "@/components/save-state";

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
        const t = splitSeconds(Number(draft.totalTimeSec));
        merged.brewTimeMin = t.minutes != null ? String(t.minutes) : "";
        merged.brewTimeSec = t.seconds != null ? String(t.seconds) : "";
      }
      return merged;
    }),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink2">Everything on this page saves itself.</p>
        <SaveStateBadge state={state} onRetry={retry} />
      </div>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Dose g</Label><Input value={form.doseG} inputMode="decimal" onChange={(e) => set("doseG", e.target.value)} /></div>
          <div><Label>Water g</Label><Input value={form.waterG} inputMode="decimal" onChange={(e) => set("waterG", e.target.value)} /></div>
          <div><Label>Brew date</Label><Input type="date" max={defaultBrewedDate()} value={form.brewedAt ?? ""} onChange={(e) => set("brewedAt", e.target.value)} /></div>
          <div><Label>Temp C</Label><Input value={form.tempC} inputMode="decimal" onChange={(e) => set("tempC", e.target.value)} /></div>
          <div><Label>Grind clicks</Label><Input value={form.grindClicks} inputMode="numeric" onChange={(e) => set("grindClicks", e.target.value)} /></div>
        </div>
        {sessions.length > 0 ? (
          <div className="mt-3">
            <Label htmlFor="brew-session">Session</Label>
            <Select id="brew-session" value={form.sessionId ?? ""} onChange={(e) => set("sessionId", e.target.value)}>
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
            <div><Label>Grinder</Label><Input value={form.grinder ?? ""} onChange={(e) => set("grinder", e.target.value)} /></div>
            <div><Label>Dripper</Label><Input value={form.dripper ?? ""} onChange={(e) => set("dripper", e.target.value)} /></div>
            <div><Label>Filter</Label><Input value={form.filter ?? ""} onChange={(e) => set("filter", e.target.value)} /></div>
            <div><Label>Water</Label><Input value={form.waterSource ?? ""} onChange={(e) => set("waterSource", e.target.value)} /></div>
          </div>
          <div className="mt-3">
            <Label>Brew time</Label>
            <MinutesSecondsInput
              minutes={form.brewTimeMin ?? ""}
              seconds={form.brewTimeSec ?? ""}
              onMinutes={(v) => setTime("min", v)}
              onSeconds={(v) => setTime("sec", v)}
            />
          </div>
        </Card>
      </details>
      <details open>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Pours - timed additions, optional</summary>
        <Card>
          <PourEditor
            rows={pourRowsFromJson(form.pours)}
            legacyCount={brew.pour_count != null && brew.pour_count !== "" ? Number(brew.pour_count) : null}
            onChange={(rows) => set("pours", pourRowsToJson(rows))}
          />
        </Card>
      </details>
      <details open>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Result</summary>
        <Card>
          <div><Label>Final beverage g</Label><Input value={form.finalBeverageG ?? ""} inputMode="decimal" onChange={(e) => set("finalBeverageG", e.target.value)} /></div>
          <div className="mt-3"><Label>Process notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </Card>
      </details>
      <details open>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Observations - what you perceived, never a diagnosis</summary>
        <Card>
          <TastingEditor
            rows={tastingRowsFromJson(form.tastings)}
            onChange={(rows) => set("tastings", tastingRowsToJson(rows))}
            notes={{ hot: form.hotNotes ?? "", warm: form.warmNotes ?? "", cold: form.coldNotes ?? "" }}
            onNotes={(stage, value) => set(`${stage}Notes`, value)}
          />
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-base font-medium">Overall notes</h3>
            <Label htmlFor="obs-overall" className="sr-only">Overall notes</Label>
            <Textarea id="obs-overall" rows={2} className="mt-1" value={form.freeformNotes ?? ""} onChange={(e) => set("freeformNotes", e.target.value)} />
          </div>
        </Card>
      </details>
    </div>
  );
}
