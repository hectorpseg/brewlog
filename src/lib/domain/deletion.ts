// ponytail: deletion consequences in words, tested once here. Every confirm
// states exactly what dies, what survives, and what gets unlinked — records
// are never silently orphaned.

export type DeletionKind = "coffee" | "brew" | "session" | "experiment" | "cupping";

export function describeDeletion(
  kind: DeletionKind,
  counts: { brews?: number; observations?: number; tastings?: number; experiments?: number },
): { title: string; body: string; confirm: string } {
  const n = (c: number | undefined, one: string, many: string) =>
    `${c ?? 0} ${c === 1 ? one : many}`;
  switch (kind) {
    case "coffee":
      return {
        title: "Delete this coffee?",
        body: `${n(counts.brews, "brew", "brews")} and ${n(counts.observations, "tasting note set", "tasting note sets")} will be permanently deleted. Linked experiments are kept but unlinked. This cannot be undone.`,
        confirm: "Delete coffee",
      };
    case "brew":
      return {
        title: "Delete this brew?",
        body: `${n(counts.observations, "tasting note set", "tasting note sets")} and ${n(counts.tastings, "tasting entry", "tasting entries")} will be permanently deleted. Linked experiments are kept but unlinked. The dose is handed back to the coffee's remaining weight. This cannot be undone.`,
        confirm: "Delete brew",
      };
    case "session":
      return {
        title: "Delete this session?",
        body: `${n(counts.brews, "brew", "brews")} stay in history, unassigned. Linked experiments are kept but unlinked. This cannot be undone.`,
        confirm: "Delete session",
      };
    case "experiment":
      return {
        title: "Delete this experiment?",
        body: "The linked brew is kept. This cannot be undone.",
        confirm: "Delete experiment",
      };
    case "cupping":
      return {
        title: "Delete this cupping?",
        body: "Only this tasting record is removed. The coffee and its brews are kept. This cannot be undone.",
        confirm: "Delete cupping",
      };
  }
}
