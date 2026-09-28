import { Fragment } from "react";

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

