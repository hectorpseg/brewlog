// ponytail: one predicate for list presentation, tested once here.
export type ExperimentLike = {
  conclusion?: string | null;
  actualResult?: string | null;
  actual_result?: string | null;
};

export function experimentStatus(exp: ExperimentLike): "open" | "answered" {
  const done = exp.conclusion ?? exp.actualResult ?? exp.actual_result;
  return done != null && String(done).trim() !== "" ? "answered" : "open";
}
