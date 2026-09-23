"use client";
import { useState } from "react";
import { Label, Select } from "./ui/controls";
import { SearchField } from "./search-field";

// Independent brew pickers with per-side search over the already-loaded
// options. Every change pushes a URL so refresh, back/forward, and bookmarks
// all reproduce the same comparison. This component only reports selection;
// the shell owns the transition (pending skeleton while loading).
export function CompareSelectors({ brews, aId, bId, onSelect }: {
  brews: { id: string; label: string }[];
  aId: string;
  bId: string;
  onSelect: (nextA: string, nextB: string) => void;
}) {
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const qA = queryA.trim().toLowerCase();
  const qB = queryB.trim().toLowerCase();
  // The selected brew always stays selectable, even mid-search.
  const optionsA = brews.filter((b) => b.id === aId || qA === "" || b.label.toLowerCase().includes(qA));
  const optionsB = brews.filter((b) => b.id === bId || qB === "" || b.label.toLowerCase().includes(qB));
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <SearchField
          id="compare-search-a"
          label="Find brew A"
          placeholder="Coffee, date…"
          value={queryA}
          onChange={setQueryA}
        />
        <Label htmlFor="compare-a">Brew A</Label>
        <Select id="compare-a" value={aId} onChange={(e) => onSelect(e.target.value, bId)}>
          {optionsA.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <SearchField
          id="compare-search-b"
          label="Find brew B"
          placeholder="Coffee, date…"
          value={queryB}
          onChange={setQueryB}
        />
        <Label htmlFor="compare-b">Brew B</Label>
        <Select id="compare-b" value={bId} onChange={(e) => onSelect(aId, e.target.value)}>
          {optionsB.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
