import { Fragment } from "react";

export type CompareFieldRow = { label: string; values: string[]; changed: boolean };

// One compare section table: label column + one value column per brew.
// Changed values read ember; missing reads "-". Rows missing on every brew
// never reach this component — order never changes. Two brews keep the tight
// `1fr auto auto` layout; more brews use equal shrinking columns (the cap of
// 4 slots keeps numeric columns legible on a phone).
export function CompareFieldTable({ rows, labels }: { rows: CompareFieldRow[]; labels: string[] }) {
  const cols =
    labels.length === 2
      ? "1fr auto auto"
      : `minmax(0,1fr) repeat(${labels.length - 1}, minmax(0,1fr))`;
  return (
    <div
      className="tnum mt-2 grid items-baseline gap-x-3 gap-y-2 text-sm"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="text-ink2"> </span>
      {labels.map((l, i) => (
        <span key={i} className="text-center text-ink2">{l}</span>
      ))}
      {rows.map((r) => (
        <Fragment key={r.label}>
          <span className="text-ink2">{r.label}</span>
          {r.values.map((v, i) => (
            <span key={i} className={v === "-" ? "text-center text-ink3" : r.changed ? "text-center font-medium text-ember" : "text-center font-medium"}>
              {v}
            </span>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
