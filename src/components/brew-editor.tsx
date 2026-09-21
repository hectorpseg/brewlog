"use client";
import { useState } from "react";
import { updateBrew, upsertObservation } from "@/app/actions";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { MinutesSecondsInput } from "@/components/brew-time-input";
import { splitSeconds, toSeconds } from "@/lib/domain/brew-time";
import { toDateInputValue } from "@/lib/domain/brew-date";
import { SaveStateBadge } from "@/components/save-state";

const SENSORY = ["acidity", "sweetness", "body", "clarity", "bitterness", "astringency", "intensity", "balance", "finish"] as const;
const LEVELS = ["", "low", "med-low", "medium", "med-high", "high"];
const NOTE_FIELDS = [
  { key: "hotNotes", label: "Hot notes" },
  { key: "warmNotes", label: "Warm notes" },
  { key: "coldNotes", label: "Cold notes" },
  { key: "freeformNotes", label: "Tasting notes" },
] as const;

export function BrewEditor({ userId, brew, observation, sessions }: {
  userId: string;
  brew: Record<string, string | number | null>;
  observation: Record<string, string | null> | null;
  sessions: { id: string; title: string }[];
}) {
  const initialTime = splitSeconds(brew.total_time_sec != null ? Number(brew.total_time_sec) : undefined);
  const [form, setForm] = useState<Record<string, string>>({
    doseG: String(brew.dose_g ?? ""), waterG: String(brew.water_g ?? ""),
    brewedAt: toDateInputValue(typeof brew.brewed_at === "string" ? brew.brewed_at : null),
    tempC: String(brew.temp_c ?? ""), grindClicks: String(brew.grind_clicks ?? ""),
    sessionId: String(brew.session_id ?? ""),
    finalBeverageG: String(brew.final_beverage_g ?? ""),
    brewTimeMin: initialTime.minutes != null ? String(initialTime.minutes) : "",
    brewTimeSec: initialTime.seconds != null ? String(initialTime.seconds) : "",
    notes: String(brew.notes ?? ""),
    ...Object.fromEntries(SENSORY.map((k) => [k, String((observation as Record<string, string> | null)?.[k] ?? "")])),
    hotNotes: String(observation?.hot_notes ?? ""), warmNotes: String(observation?.warm_notes ?? ""),
    coldNotes: String(observation?.cold_notes ?? ""), freeformNotes: String(observation?.freeform_notes ?? ""),
  });
  const key = draftKey(userId, "brew-edit", String(brew.id));
  // Server is authoritative once synchronized: weigh any local draft against
  // the freshest server timestamp so a stale draft can never clobber it.
  const serverUpdatedAt =
    [brew.updated_at, observation?.updated_at]
      .filter((v): v is string => typeof v === "string" && v !== "")
      .sort()
      .at(-1) ?? null;
  const { state, retry } = useAutosave({
    key, value: form,
    sync: (v) => updateBrew(String(brew.id), v as Record<string, string>).then((r) => { if (r?.error) throw new Error(r.error); }),
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
        <p className="text-sm text-ink2">Recipe saves itself. Tasting notes save on tap.</p>
        <SaveStateBadge state={state} onRetry={retry} />
      </div>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Dose g</Label><Input value={form.doseG} inputMode="decimal" onChange={(e) => set("doseG", e.target.value)} /></div>
          <div><Label>Water g</Label><Input value={form.waterG} inputMode="decimal" onChange={(e) => set("waterG", e.target.value)} /></div>
          <div><Label>Brew date</Label><Input type="date" value={form.brewedAt ?? ""} onChange={(e) => set("brewedAt", e.target.value)} /></div>
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
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Observations — what you perceived, never a diagnosis</summary>
        <Card>
          <form onSubmit={saveSensory}>
          <div className="grid grid-cols-2 gap-3">
            {SENSORY.map((k) => (
              <div key={k}>
                <Label htmlFor={`obs-${k}`}>{k}</Label>
                <Select id={`obs-${k}`} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l === "" ? "—" : l}</option>)}
                </Select>
              </div>
            ))}
          </div>
          {NOTE_FIELDS.map(({ key, label }) => (
            <div key={key} className="mt-3">
              <Label htmlFor={`obs-${key}`}>{label}</Label>
              <Textarea id={`obs-${key}`} rows={2} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          {saveError ? <p role="alert" className="mt-2 text-sm text-ember">{saveError}</p> : null}
          <Button className="mt-3">{savedTick ? "Saved" : "Save observations"}</Button>
          </form>
        </Card>
      </details>
    </div>
  );
}
