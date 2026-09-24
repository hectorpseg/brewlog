"use client";
import { Trash2 } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/controls";
import { cn } from "@/components/ui/utils";
import {
  POUR_PATTERNS, emptyPourDraft, formatPourTime, parsePourTime,
  type PourDraftRow,
} from "@/lib/domain/pours";

// Compact structured-pour rows for fast entry while brewing: one row per
// pour with time (m:ss), amount (g), pattern, bloom toggle, optional note.
// Sequence is the row order (1-based); reordering is out of scope, matching
// the tasting editor. Incomplete rows stay local-only until saved.
export function PourEditor({ rows, onChange }: {
  rows: PourDraftRow[];
  onChange: (rows: PourDraftRow[]) => void;
}) {
  function updateAt(index: number, patch: Partial<PourDraftRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeAt(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  function addRow() {
    onChange([...rows, emptyPourDraft(rows.length === 0)]);
  }
  if (rows.length === 0) {
    return (
      <div>
        <p className="text-sm text-ink2">No structured pours yet. Optional - add them while brewing.</p>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 min-h-11 rounded-[10px] border border-line bg-card px-4 py-2 font-medium"
        >
          Add pour
        </button>
      </div>
    );
  }
  return (
    <div>
      <ul className="flex flex-col">
        {rows.map((r, i) => {
          const parsed = parsePourTime(r.time);
          const amountOk = r.amount.trim() === "" || (Number.isFinite(Number(r.amount)) && Number(r.amount) > 0);
          return (
            <li key={i} className="border-b border-line py-2 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="tnum text-sm font-medium">
                  Pour {i + 1}
                  {parsed != null ? <span className="ml-2 font-normal text-ink2">{formatPourTime(parsed)}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove pour ${i + 1}`}
                  className="grid min-h-11 min-w-11 place-items-center text-ink2 transition-transform active:scale-95"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`pour-${i}-time`}>Time m:ss</Label>
                  <Input
                    id={`pour-${i}-time`}
                    placeholder="0:35"
                    autoComplete="off"
                    inputMode="numeric"
                    value={r.time}
                    onChange={(e) => updateAt(i, { time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`pour-${i}-amount`}>Amount g</Label>
                  <Input
                    id={`pour-${i}-amount`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="60"
                    value={r.amount}
                    onChange={(e) => updateAt(i, { amount: e.target.value })}
                    aria-invalid={!amountOk}
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 items-end gap-2">
                <div>
                  <Label htmlFor={`pour-${i}-pattern`}>Pattern</Label>
                  <Select
                    id={`pour-${i}-pattern`}
                    value={POUR_PATTERNS.includes(r.pattern as (typeof POUR_PATTERNS)[number]) ? r.pattern : "center"}
                    onChange={(e) => updateAt(i, { pattern: e.target.value })}
                  >
                    {POUR_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <button
                  type="button"
                  aria-pressed={r.bloom}
                  onClick={() => updateAt(i, { bloom: !r.bloom })}
                  className={cn(
                    "min-h-11 rounded-[10px] border px-4 py-2 font-medium transition-transform active:scale-[0.98]",
                    r.bloom ? "border-ember bg-ember text-white" : "border-line bg-card text-ink2",
                  )}
                >
                  {r.bloom ? "Bloom on" : "Bloom"}
                </button>
              </div>
              <div className="mt-2">
                <Label htmlFor={`pour-${i}-note`} className="sr-only">Pour {i + 1} note</Label>
                <Input
                  id={`pour-${i}-note`}
                  placeholder="Note (optional)"
                  autoComplete="off"
                  value={r.note}
                  onChange={(e) => updateAt(i, { note: e.target.value })}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 min-h-11 rounded-[10px] border border-line bg-card px-4 py-2 font-medium"
      >
        Add pour
      </button>
    </div>
  );
}
