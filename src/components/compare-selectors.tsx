"use client";
import { Plus, X } from "lucide-react";
import { COMPARE_SLOT_KEYS, type BrewOption } from "@/lib/domain/brew-diff";
import { useT } from "@/lib/i18n/client";
import { BrewCombobox } from "./brew-combobox";

// One brew picker per compared slot, over the already-loaded options. Changes
// push a URL so refresh, back/forward, and bookmarks reproduce the same
// selection. Picking a brew already in another slot swaps positions instead
// of duplicating; slots beyond the first two can be removed.
export function CompareSelectors({ brews, ids, onChange }: {
  brews: BrewOption[];
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useT();
  const full = ids.length >= COMPARE_SLOT_KEYS.length;
  function setSlot(i: number, id: string) {
    const next = [...ids];
    const at = ids.indexOf(id);
    if (at >= 0 && at !== i) {
      // selections must stay distinct: swap instead of duplicating
      next[at] = ids[i];
    }
    next[i] = id;
    onChange(next);
  }
  function removeSlot(i: number) {
    if (ids.length <= 2) return;
    onChange(ids.filter((_, j) => j !== i));
  }
  function addSlot() {
    if (full) return;
    // default the new slot to the latest brew not already selected
    const candidate = brews.find((b) => !ids.includes(b.id));
    if (!candidate) return;
    onChange([...ids, candidate.id]);
  }
  return (
    <div className="flex flex-col gap-2">
      {ids.map((id, i) => (
        <div key={i} className="flex items-end gap-1">
          <div className="min-w-0 flex-1">
            <BrewCombobox
              id={`compare-${i}`}
              label={t(COMPARE_SLOT_KEYS[i])}
              brews={brews}
              value={id}
              onSelect={(x) => setSlot(i, x)}
            />
          </div>
          {ids.length > 2 ? (
            <button
              type="button"
              aria-label={t("compare.remove")}
              onClick={() => removeSlot(i)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-ink3 transition-colors duration-150 hover:text-ember"
            >
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </div>
      ))}
      {!full ? (
        <button
          type="button"
          onClick={addSlot}
          disabled={brews.length <= ids.length}
          className="flex h-9 items-center gap-1 self-start rounded-full px-3 text-xs text-ember transition-colors duration-150 hover:underline disabled:text-ink3 disabled:no-underline"
        >
          <Plus size={14} aria-hidden /> {t("compare.add")}
        </button>
      ) : null}
    </div>
  );
}
