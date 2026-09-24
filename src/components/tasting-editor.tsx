"use client";
import { Trash2 } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/controls";
import {
  SUGGESTED_ATTRIBUTES, TASTING_STAGES,
  type TastingDraftRow, type TastingStage,
} from "@/lib/domain/tastings";

const STAGE_LABEL: Record<TastingStage, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

// Three ruled moments in the cooling process — not three forms. Each stage
// contains its attributes plus its temperature-specific notes textarea, so
// "Hot notes" visibly belongs to Hot. Notes ride the same form state as
// before (same persistence); only their presentation moved here.
export function TastingEditor({ rows, notes, onChange, onNotes }: {
  rows: TastingDraftRow[];
  notes: Record<TastingStage, string>;
  onChange: (rows: TastingDraftRow[]) => void;
  onNotes: (stage: TastingStage, value: string) => void;
}) {
  function updateAt(index: number, patch: Partial<TastingDraftRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeAt(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  function addRow(stage: TastingStage) {
    onChange([...rows, { stage, attribute: "", value: "" }]);
  }
  return (
    <div>
      <p className="text-sm text-ink2">Rate 1-10 as it cools. An attribute can differ per stage.</p>
      <datalist id="tasting-attributes">
        {SUGGESTED_ATTRIBUTES.map((a) => <option key={a} value={a} />)}
      </datalist>
      {TASTING_STAGES.map((stage, si) => {
        const indexes = rows.map((r, i) => (r.stage === stage ? i : -1)).filter((i) => i >= 0);
        return (
          <section key={stage} aria-label={`${STAGE_LABEL[stage]} tasting`} className={si > 0 ? "mt-6 border-t border-line pt-5" : "mt-4"}>
            <h3 className="text-base font-medium">{STAGE_LABEL[stage]}</h3>
            {indexes.length === 0 ? (
              <p className="mt-1 text-sm text-ink2">No attributes yet.</p>
            ) : (
              <ul className="mt-1 flex flex-col">
                {indexes.map((i) => (
                  <li key={i} className="grid grid-cols-[1fr_3.75rem_2.75rem] items-center gap-2 border-b border-line py-1.5 last:border-b-0">
                    <Input
                      aria-label={`${STAGE_LABEL[stage]} attribute name`}
                      list="tasting-attributes"
                      placeholder="e.g. acidity"
                      autoComplete="off"
                      value={rows[i].attribute}
                      onChange={(e) => updateAt(i, { attribute: e.target.value })}
                    />
                    <Input
                      aria-label={`${rows[i].attribute || "Attribute"} rating, 1 to 10`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={10}
                      placeholder="1-10"
                      className="tnum px-2 text-center"
                      value={rows[i].value}
                      onChange={(e) => updateAt(i, { value: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      aria-label={`Remove ${rows[i].attribute || "attribute"} from ${stage}`}
                      className="grid min-h-11 min-w-11 place-items-center text-ink2 transition-transform active:scale-95"
                    >
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => addRow(stage)}
              className="mt-1 min-h-11 text-left text-sm font-medium text-ember hover:underline"
            >
              + Add attribute
            </button>
            <div className="mt-3">
              <Label htmlFor={`taste-${stage}-notes`}>{STAGE_LABEL[stage]} notes</Label>
              <Textarea
                id={`taste-${stage}-notes`}
                rows={2}
                className="mt-1"
                value={notes[stage] ?? ""}
                onChange={(e) => onNotes(stage, e.target.value)}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
