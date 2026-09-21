"use client";
import { useRouter } from "next/navigation";
import { Label, Select } from "./ui/controls";

// Independent brew pickers. Every change pushes a URL so refresh, back/forward,
// and bookmarks all reproduce the same comparison. Defaults (latest two) are
// resolved server-side and passed in — this component only navigates.
export function CompareSelectors({ brews, aId, bId }: {
  brews: { id: string; label: string }[];
  aId: string;
  bId: string;
}) {
  const router = useRouter();
  function go(nextA: string, nextB: string) {
    if (!nextA || !nextB) return;
    router.push(`/brews/compare?a=${nextA}&b=${nextB}`);
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="compare-a">Brew A</Label>
        <Select id="compare-a" value={aId} onChange={(e) => go(e.target.value, bId)}>
          {brews.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="compare-b">Brew B</Label>
        <Select id="compare-b" value={bId} onChange={(e) => go(aId, e.target.value)}>
          {brews.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
