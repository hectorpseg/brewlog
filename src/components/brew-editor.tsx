"use client";
import { useState } from "react";
import { updateBrew, upsertObservation } from "@/app/actions";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { Button, Card, Input, Label, Textarea } from "@/components/ui/controls";
import { SaveStateBadge } from "@/components/save-state";

const SENSORY = ["acidity", "sweetness", "body", "clarity", "bitterness", "astringency", "intensity", "balance", "finish"] as const;
const LEVELS = ["", "low", "med-low", "medium", "med-high", "high"];

export function BrewEditor({ userId, brew, observation }: {
  userId: string;
  brew: Record<string, string | number | null>;
  observation: Record<string, string | null> | null;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    doseG: String(brew.dose_g ?? ""), waterG: String(brew.water_g ?? ""),
    tempC: String(brew.temp_c ?? ""), grindClicks: String(brew.grind_clicks ?? ""),
    notes: String(brew.notes ?? ""),
    ...Object.fromEntries(SENSORY.map((k) => [k, String((observation as Record<string, string> | null)?.[k] ?? "")])),
    hotNotes: String(observation?.hot_notes ?? ""), warmNotes: String(observation?.warm_notes ?? ""),
    coldNotes: String(observation?.cold_notes ?? ""), freeformNotes: String(observation?.freeform_notes ?? ""),
  });
  const key = draftKey(userId, "brew-edit", String(brew.id));
  const { state } = useAutosave({
    key, value: form,
    sync: (v) => updateBrew(String(brew.id), v as Record<string, string>).then((r) => { if (r?.error) throw new Error(r.error); }),
    onRestored: (d) => setForm(d as Record<string, string>),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function saveSensory() {
    await upsertObservation({ ...(form as Record<string, string>), brewId: String(brew.id) });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end"><SaveStateBadge state={state} /></div>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Dose g</Label><Input value={form.doseG} inputMode="decimal" onChange={(e) => set("doseG", e.target.value)} /></div>
          <div><Label>Water g</Label><Input value={form.waterG} inputMode="decimal" onChange={(e) => set("waterG", e.target.value)} /></div>
          <div><Label>Temp C</Label><Input value={form.tempC} inputMode="decimal" onChange={(e) => set("tempC", e.target.value)} /></div>
          <div><Label>Grind clicks</Label><Input value={form.grindClicks} inputMode="numeric" onChange={(e) => set("grindClicks", e.target.value)} /></div>
        </div>
        <div className="mt-3"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      </Card>
      <details open>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Observations (what you perceived — never auto-diagnosed)</summary>
        <Card>
          <div className="grid grid-cols-2 gap-3">
            {SENSORY.map((k) => (
              <div key={k}>
                <Label>{k}</Label>
                <select value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-300 px-2 py-2 text-base">
                  {LEVELS.map((l) => <option key={l} value={l}>{l === "" ? "—" : l}</option>)}
                </select>
              </div>
            ))}
          </div>
          {(["hotNotes", "warmNotes", "coldNotes"] as const).map((k) => (
            <div key={k} className="mt-3"><Label>{k}</Label><Textarea rows={2} value={form[k]} onChange={(e) => set(k, e.target.value)} /></div>
          ))}
          <Button className="mt-3" onClick={saveSensory}>Save observations</Button>
        </Card>
      </details>
    </div>
  );
}
