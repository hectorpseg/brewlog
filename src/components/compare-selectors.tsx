"use client";
import type { BrewOption } from "@/lib/domain/brew-diff";
import { BrewCombobox } from "./brew-combobox";

// Two independent brew pickers over the already-loaded options. Every change
// pushes a URL so refresh, back/forward, and bookmarks reproduce the same
// comparison. This component only reports selection; the shell owns the
// transition (pending skeleton while loading).
export function CompareSelectors({ brews, aId, bId, onSelect }: {
  brews: BrewOption[];
  aId: string;
  bId: string;
  onSelect: (nextA: string, nextB: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <BrewCombobox id="compare-a" label="Brew A" brews={brews} value={aId} onSelect={(id) => onSelect(id, bId)} />
      <BrewCombobox id="compare-b" label="Brew B" brews={brews} value={bId} onSelect={(id) => onSelect(aId, id)} />
    </div>
  );
}
