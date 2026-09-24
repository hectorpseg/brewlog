"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input, Label, Select, Textarea } from "@/components/ui/controls";
import {
  CUSTOM_ATTRIBUTE_VALUE, TASTING_MAX, TASTING_MIN, TASTING_STAGE_LABEL, TASTING_STAGES,
  attributeOptions, isSuggestedAttribute, normalizeAttribute,
  type TastingDraftRow, type TastingStage,
} from "@/lib/domain/tastings";

// Three ruled moments in the cooling process, not three forms. Each stage
// contains its attributes plus its temperature-specific notes textarea, so
// "Hot notes" visibly belongs to Hot. Notes ride the same form state as
// before (same persistence); only their presentation moved here.
//
// Attribute entry is a native select (deterministic on mobile and desktop,
// unlike datalist): the fixed vocabulary, the row's own custom value when it
// has one, and a Custom option that swaps the row to a text input. Custom
// names stay supported; the sentinel itself is never persisted.
export function TastingEditor({ rows, notes, onChange, onNotes }: {
  rows: TastingDraftRow[];
  notes: Record<TastingStage, string>;
  onChange: (rows: TastingDraftRow[]) => void;
  onNotes: (stage: TastingStage, value: string) => void;
}) {
  // Rows armed for custom entry with no text yet. Derived custom values
  // (non-empty, not suggested) need no tracking; indices are re-based on
  // removal so the set survives row deletion.
  const [customRows, setCustomRows] = useState<Set<number>>(new Set());
  function updateAt(index: number, patch: Partial<TastingDraftRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function setAttribute(index: number, value: string) {
    updateAt(index, { attribute: value });
    setCustomRows((prev) => {
      const next = new Set(prev);
      if (value === "" || isSuggestedAttribute(value)) next.delete(index);
      return next;
    });
  }
  function armCustom(index: number) {
    setCustomRows((prev) => new Set(prev).add(index));
  }
  function disarmIfEmpty(index: number) {
    if (rows[index]?.attribute === "") {
      setCustomRows((prev) => {
        if (!prev.has(index)) return prev;
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }
  function removeAt(index: number) {
    onChange(rows.filter((_, i) => i !== index));
    setCustomRows((prev) => {
      const next = new Set<number>();
      for (const x of prev) {
        if (x === index) continue;
        next.add(x > index ? x - 1 : x);
      }
      return next;
    });
  }
  function addRow(stage: TastingStage) {
    onChange([...rows, { stage, attribute: "", value: "" }]);
  }
  return (
    <div>
      <p className="text-sm text-ink2">Rate {TASTING_MIN}-{TASTING_MAX} as it cools. An attribute can differ per stage.</p>
      {TASTING_STAGES.map((stage, si) => {
        const indexes = rows.map((r, i) => (r.stage === stage ? i : -1)).filter((i) => i >= 0);
        return (
          <section key={stage} aria-label={`${TASTING_STAGE_LABEL[stage]} tasting`} className={si > 0 ? "mt-6 border-t border-line pt-5" : "mt-4"}>
            <h3 className="text-base font-medium">{TASTING_STAGE_LABEL[stage]}</h3>
            {indexes.length === 0 ? (
              <p className="mt-1 text-sm text-ink2">No attributes yet.</p>
            ) : (
              <ul className="mt-1 flex flex-col">
                {indexes.map((i) => {
                  const raw = rows[i].attribute;
                  const suggested = isSuggestedAttribute(raw);
                  const custom = customRows.has(i) || (raw !== "" && !suggested);
                  return (
                  <li key={i} className="grid grid-cols-[1fr_3.75rem_2.75rem] items-center gap-2 border-b border-line py-1.5 last:border-b-0">
                    {custom ? (
                      <Input
                        aria-label={`${TASTING_STAGE_LABEL[stage]} custom attribute name`}
                        placeholder="Custom attribute"
                        autoComplete="off"
                        autoFocus={customRows.has(i)}
                        value={raw}
                        onChange={(e) => setAttribute(i, e.target.value)}
                        onBlur={() => disarmIfEmpty(i)}
                      />
                    ) : (
                      <Select
                        aria-label={`${TASTING_STAGE_LABEL[stage]} attribute name`}
                        value={suggested ? normalizeAttribute(raw) : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === CUSTOM_ATTRIBUTE_VALUE) armCustom(i);
                          else setAttribute(i, v);
                        }}
                      >
                        {attributeOptions(raw).map((o) => (
                          <option key={o.value + o.label} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    )}
                    <Input
                      aria-label={`${rows[i].attribute || "Attribute"} rating, ${TASTING_MIN} to ${TASTING_MAX}`}
                      type="number"
                      inputMode="numeric"
                      min={TASTING_MIN}
                      max={TASTING_MAX}
                      placeholder={`${TASTING_MIN}-${TASTING_MAX}`}
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
                  );
                })}
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
              <Label htmlFor={`taste-${stage}-notes`}>{TASTING_STAGE_LABEL[stage]} notes</Label>
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
