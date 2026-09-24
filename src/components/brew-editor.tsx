"use client";
import { useState } from "react";
import { updateBrew, upsertObservation, upsertTastings } from "@/app/actions";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { brewEditorDefaults } from "@/lib/db/brew-update";
import { completeTastingEntries, tastingRowsFromJson, tastingRowsToJson, tastingsUpdatedAt } from "@/lib/domain/tastings";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { TastingEditor } from "@/components/tasting-editor";
import { MinutesSecondsInput } from "@/components/brew-time-input";
import { splitSeconds, toSeconds } from "@/lib/domain/brew-time";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { SaveStateBadge } from "@/components/save-state";

export function BrewEditor({ userId, brew, observation, tastings, sessions }: {
  userId: string;
  brew: Record<string, string | number | null>;
  observation: Record<string, string | null> | null;
  tastings: { stage: unknown; attribute: unknown; value: unknown; updated_at?: unknown }[] | null;
  sessions: { id: string; title: string }[];
}) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    brewEditorDefaults(
      brew as Record<string, unknown>,
      observation as Record<string, unknown> | null,
      tastings,
    ),
  );
  const key = draftKey(userId, "brew-edit", String(brew.id));
  // Server is authoritative once synchronized: weigh any local draft against
  // the freshest server timestamp so a stale draft can never clobber it.
  const serverUpdatedAt =
    [brew.updated_at, observation?.updated_at, tastingsUpdatedAt(tastings)]
      .filter((v): v is string => typeof v === "string" && v !== "")
      .sort()
      .at(-1) ?? null;
  const { state, retry } = useAutosave({
    key, value: form,
    // one debounced sync for recipe + tasting: no separate save action
    sync: (v) => (async () => {
      const patch = v as Record<string, string>;
      const brewId = String(brew.id);
      const brewRes = await updateBrew(brewId, patch);
      if (brewRes?.error) throw new Error(brewRes.error);
      const tasteRes = await upsertTastings(brewId, completeTastingEntries(tastingRowsFromJson(patch.tastings)));
      if (tasteRes?.error) throw new Error(tasteRes.error);
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

  const [savedTick, setSavedTick] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  async function saveSensory(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    const r = await upsertObservation({ ...(form as Record<string, string>), brewId: String(brew.id) });
    if (r?.error) {
      setSaveError(r.error);
      return;
    }
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2500);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink2">Recipe and tasting save themselves. Notes below save on tap.</p>
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
            <div><Label>Pours</Label><Input value={form.pourCount ?? ""} inputMode="numeric" onChange={(e) => set("pourCount", e.target.value)} /></div>
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
          <form onSubmit={saveSensory}>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-base font-medium">Overall notes</h3>
            <Label htmlFor="obs-overall" className="sr-only">Overall notes</Label>
            <Textarea id="obs-overall" rows={2} className="mt-1" value={form.freeformNotes ?? ""} onChange={(e) => set("freeformNotes", e.target.value)} />
            {saveError ? <p role="alert" className="mt-2 text-sm text-ember">{saveError}</p> : null}
            <Button className="mt-3">{savedTick ? "Saved" : "Save notes"}</Button>
          </div>
          </form>
        </Card>
      </details>
    </div>
  );
}
