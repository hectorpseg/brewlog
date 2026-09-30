"use client";
import { Trash2 } from "lucide-react";
import { Input, Label, Select, Textarea, Toggle } from "@/components/ui/controls";
import { cn } from "@/components/ui/utils";
import {
  POUR_PATTERNS, POUR_PATTERN_KEY, emptyPourDraft, formatPourTime, formatPourTotal, parsePourTime,
  pourCountAndTotal, type PourDraftRow,
} from "@/lib/domain/pours";
import { useT } from "@/lib/i18n/client";

// Compact structured-pour rows for fast entry while brewing: one row per
// pour with time (m:ss), amount (g), temperature, pattern, bloom toggle,
// MeloDrip toggle, optional note, and - on Switch brews only - the per-pour
// Switch position. New pours inherit temperature/MeloDrip/Switch from the
// previous pour; pour 1 initializes temperature from the Brew's starting
// temperature when available. brews.temp_c itself is never touched by pours.
// Sequence is the row order (1-based); reordering is out of scope, matching
// the tasting editor. Incomplete rows stay local-only until saved. The count
// line at the top is a read-only counter of complete pours plus their summed
// amount - there is no manual pour count input anymore.

function tempValid(temp: string): boolean {
  if (temp.trim() === "") return true;
  const t = Number(temp);
  return Number.isFinite(t) && t >= 50 && t <= 100;
}

export function PourEditor({ rows, legacyCount, switchOn = false, brewTemp = null, onChange }: {
  rows: PourDraftRow[];
  legacyCount?: number | null;
  // brew-level Hario Switch: pours show Open/Closed only when it is active
  switchOn?: boolean;
  // brew-level starting temperature (string form state); prefills pour 1 only,
  // never written back to the brew
  brewTemp?: string | null;
  onChange: (rows: PourDraftRow[]) => void;
}) {
  function updateAt(index: number, patch: Partial<PourDraftRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeAt(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  // New pours inherit temperature, MeloDrip, and Switch from the previous
  // pour. Pour 1 starts from the Brew's starting temperature value (the brew
  // row itself is never written — brews.temp_c stays untouched by pours).
  function addRow() {
    const prev = rows[rows.length - 1];
    const row = emptyPourDraft(rows.length === 0, prev);
    if (rows.length === 0 && brewTemp != null && brewTemp !== "") row.temp = brewTemp;
    onChange([...rows, row]);
  }
  const t = useT();
  const { count, totalG } = pourCountAndTotal(rows);
  const total = formatPourTotal(count, totalG, t);
  if (rows.length === 0) {
    return (
      <div>
        {legacyCount != null && legacyCount > 0 ? (
          <p className="tnum text-sm">
            {t("pours.record.prefix")}{legacyCount} {legacyCount === 1 ? t("pours.total.one") : t("pours.total.many")}.
          </p>
        ) : null}
        <p className="mt-1 text-sm text-ink2">{t("pours.empty")}</p>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 min-h-11 rounded-[10px] border border-line bg-card px-4 py-2 font-medium"
        >
          {t("pours.add")}
        </button>
      </div>
    );
  }
  return (
    <div>
      {total ? <p className="tnum text-sm font-medium" aria-live="polite">{total}</p> : null}
      <ul className="flex flex-col">
        {rows.map((r, i) => {
          const parsed = parsePourTime(r.time);
          const amountOk = r.amount.trim() === "" || (Number.isFinite(Number(r.amount)) && Number(r.amount) > 0);
          return (
            <li key={i} className="border-b border-line py-2 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="tnum text-sm font-medium">
                  {t("pours.pour")} {i + 1}
                  {parsed != null ? <span className="ml-2 font-normal text-ink2">{formatPourTime(parsed)}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`${t("pours.remove")} ${i + 1}`}
                  className="grid min-h-11 min-w-11 place-items-center text-ink2 transition-transform active:scale-95"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`pour-${i}-time`}>{t("pours.time")}</Label>
                  <Input
                    id={`pour-${i}-time`}
                    placeholder="0:35"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    value={r.time}
                    onChange={(e) => updateAt(i, { time: e.target.value })}
                    aria-invalid={r.time.trim() !== "" && parsed == null}
                  />
                </div>
                <div>
                  <Label htmlFor={`pour-${i}-amount`}>{t("pours.amount")}</Label>
                  <Input
                    id={`pour-${i}-amount`}
                    type="number"
                    step="any"
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
                  <Label htmlFor={`pour-${i}-pattern`}>{t("pours.pattern")}</Label>
                  <Select
                    id={`pour-${i}-pattern`}
                    value={POUR_PATTERNS.includes(r.pattern as (typeof POUR_PATTERNS)[number]) ? r.pattern : "center"}
                    onChange={(e) => updateAt(i, { pattern: e.target.value })}
                  >
                    {POUR_PATTERNS.map((p) => <option key={p} value={p}>{t(POUR_PATTERN_KEY[p])}</option>)}
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
                  {r.bloom ? t("pour.bloomOn") : t("pour.bloom")}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 items-end gap-2">
                <div>
                  <Label htmlFor={`pour-${i}-temp`}>{t("pours.temp")}</Label>
                  <Input
                    id={`pour-${i}-temp`}
                    inputMode="decimal"
                    placeholder={i === 0 && brewTemp ? brewTemp : undefined}
                    autoComplete="off"
                    value={r.temp}
                    onChange={(e) => updateAt(i, { temp: e.target.value })}
                    aria-invalid={!tempValid(r.temp)}
                  />
                </div>
                <div className="flex min-h-11 items-center gap-2">
                  <Toggle
                    label="MeloDrip"
                    pressed={r.melodrip}
                    onToggle={() => updateAt(i, { melodrip: !r.melodrip })}
                  />
                  {switchOn ? (
                    <Toggle
                      label={r.switchState === "open" ? t("pour.switch.open") : t("pour.switch.closed")}
                      pressed={r.switchState === "open"}
                      onToggle={() => updateAt(i, { switchState: r.switchState === "open" ? "closed" : "open" })}
                    />
                  ) : null}
                </div>
              </div>
              <div className="mt-2">
                <Label htmlFor={`pour-${i}-note`} className="sr-only">{t("pours.pour")} {i + 1} · {t("pours.notePlaceholder")}</Label>
                <Textarea
                  id={`pour-${i}-note`}
                  rows={1}
                  maxLength={500}
                  placeholder={t("pours.notePlaceholder")}
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
        {t("pours.add")}
      </button>
    </div>
  );
}
