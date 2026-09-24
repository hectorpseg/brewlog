import { Fragment } from "react";
import Link from "next/link";
import { experimentStatus } from "@/lib/domain/experiments";

export type CompareFieldRow = { label: string; a: string; b: string; changed: boolean };

// One compare section table: fixed field order, label | Brew A | Brew B.
// Changed values read ember; missing reads "-". Pairs missing on both
// sides never reach this component — order never changes.
export function CompareFieldTable({ rows }: { rows: CompareFieldRow[] }) {
  return (
    <div className="tnum mt-2 grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 gap-y-2 text-sm">
      <span className="text-ink2"> </span>
      <span className="text-center text-ink2">Brew A</span>
      <span className="text-center text-ink2">Brew B</span>
      {rows.map((r) => (
        <Fragment key={r.label}>
          <span className="text-ink2">{r.label}</span>
          <span className={r.a === "-" ? "text-center text-ink3" : r.changed ? "text-center font-medium text-ember" : "text-center font-medium"}>
            {r.a}
          </span>
          <span className={r.b === "-" ? "text-center text-ink3" : r.changed ? "text-center font-medium text-ember" : "text-center font-medium"}>
            {r.b}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export type CompareExperiment = {
  id: string;
  hypothesis: string | null;
  conclusion: string | null;
  actual_result: string | null;
};

// Per-side linked experiments with recorded evaluation state only —
// "answered" vs "open" comes from the data, never implied.
export function CompareExperiments({ a, b }: { a: CompareExperiment[]; b: CompareExperiment[] }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {([
        ["Brew A", a],
        ["Brew B", b],
      ] as const).map(([side, list]) => (
        <div key={side}>
          <p className="text-sm font-medium">
            {side} · {list.length} ({list.filter((e) => experimentStatus(e) === "answered").length} answered)
          </p>
          {list.length === 0 ? (
            <p className="mt-0.5 text-sm text-ink2">No linked experiments.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-1">
              {list.map((e) => (
                <li key={e.id}>
                  <Link href={`/experiments/${e.id}`} className="text-sm text-ember underline">
                    {e.hypothesis ? String(e.hypothesis).slice(0, 80) : "Untitled experiment"}
                    {" · "}{experimentStatus(e)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
