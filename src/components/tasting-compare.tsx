import { Fragment } from "react";
import type { TastingComparisonStage } from "@/lib/domain/tastings";

// Stage → Attribute → one column per brew. Missing sides render "-",
// never invented. Changed values read ember; identical values stay ink.
// Narrow label column plus fixed-score columns so it holds on a phone.
export function TastingCompare({ labels, stages }: {
  labels: string[];
  stages: TastingComparisonStage[];
}) {
  if (stages.length === 0) {
    return <p className="mt-2 text-sm text-ink2">No tasting entries yet - rate Hot, Warm, Cold on each brew.</p>;
  }
  const cols = `minmax(0,1fr) repeat(${labels.length}, minmax(2.5rem,3.5rem))`;
  return (
    <div className="mt-2 flex flex-col gap-4">
      {stages.map(({ stage, rows }) => (
        <section key={stage} aria-label={`${stage} comparison`}>
          <h3 className="text-sm font-medium capitalize">{stage}</h3>
          <div
            className="tnum mt-1 grid items-baseline gap-2 text-sm"
            style={{ gridTemplateColumns: cols }}
          >
            <span className="text-ink2">Attribute</span>
            {labels.map((l, i) => (
              <span key={i} className="text-center text-ink2">{l}</span>
            ))}
            {rows.map((r) => (
              <Fragment key={r.attribute}>
                <span>{r.attribute}</span>
                {r.values.map((v, i) => (
                  <span key={i} className={v == null ? "text-center text-ink3" : r.changed ? "text-center font-medium text-ember" : "text-center font-medium"}>
                    {v ?? "-"}
                  </span>
                ))}
              </Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
