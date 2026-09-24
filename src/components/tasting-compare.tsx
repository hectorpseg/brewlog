import { Fragment } from "react";
import type { TastingComparisonStage } from "@/lib/domain/tastings";

// Stage → Attribute → A / B. Missing sides render "-", never invented.
// Changed values read ember; identical values stay ink. Narrow three-column
// grid so it holds on a phone without horizontal scrolling.
export function TastingCompare({ aLabel, bLabel, stages }: {
  aLabel: string;
  bLabel: string;
  stages: TastingComparisonStage[];
}) {
  if (stages.length === 0) {
    return <p className="mt-2 text-sm text-ink2">No tasting entries yet - rate Hot, Warm, Cold on each brew.</p>;
  }
  return (
    <div className="mt-2 flex flex-col gap-4">
      {stages.map(({ stage, rows }) => (
        <section key={stage} aria-label={`${stage} comparison`}>
          <h3 className="text-sm font-medium capitalize">{stage}</h3>
          <div className="tnum mt-1 grid grid-cols-[1fr_3.5rem_3.5rem] items-baseline gap-2 text-sm">
            <span className="text-ink2">Attribute</span>
            <span className="text-center text-ink2">{aLabel}</span>
            <span className="text-center text-ink2">{bLabel}</span>
            {rows.map((r) => (
              <Fragment key={r.attribute}>
                <span>{r.attribute}</span>
                <span className={r.a == null ? "text-center text-ink3" : r.changed ? "text-center font-medium text-ember" : "text-center font-medium"}>
                  {r.a ?? "-"}
                </span>
                <span className={r.b == null ? "text-center text-ink3" : r.changed ? "text-center font-medium text-ember" : "text-center font-medium"}>
                  {r.b ?? "-"}
                </span>
              </Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
