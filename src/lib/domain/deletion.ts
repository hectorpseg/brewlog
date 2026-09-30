// ponytail: deletion consequences in words, composed once here from non-zero
// counts only. Every confirm states exactly what dies, what survives, and what
// gets unlinked — records are never silently orphaned. Zero-count fragments
// never render, and with no counts left the body is the generic warning.
// All wording comes from translation keys; this module holds no English copy.

import type { TranslationKey } from "@/lib/i18n/dictionaries";

export type DeletionKind = "coffee" | "brew" | "session" | "cupping";

export type Translator = (key: TranslationKey) => string;

export type DeletionCounts = {
  brews?: number;
  observations?: number;
  tastings?: number;
  pours?: number;
};

export type DeletionMessage = { title: string; body: string; confirm: string };

// "1 brew", pluralized on the count; the keys are countable nouns.
function fragment(n: number, one: TranslationKey, many: TranslationKey, t: Translator): string {
  return `${n} ${t(n === 1 ? one : many)}`;
}

// Natural join: "a and b", or "a, b, and c" for three or more.
function joinFragments(parts: string[], t: Translator): string {
  if (parts.length === 1) return parts[0];
  const and = t("delete.and");
  if (parts.length === 2) return `${parts[0]} ${and} ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, ${and} ${parts[parts.length - 1]}`;
}

// Shared composer: collect surviving (non-zero) fragments, join them with the
// kind's tail, and fall back to the generic warning when none remain.
function compose(
  parts: string[],
  tailKey: TranslationKey,
  t: Translator,
): string {
  if (parts.length === 0) return t("delete.generic");
  return `${joinFragments(parts, t)} ${t(tailKey)} ${t("delete.undo")}`;
}

export function describeDeletion(
  kind: DeletionKind,
  counts: DeletionCounts,
  t: Translator,
): DeletionMessage {
  const gt = (n: number | undefined) => (n ?? 0) > 0;
  switch (kind) {
    case "coffee": {
      const parts = [
        gt(counts.brews) ? fragment(counts.brews!, "delete.brewsOne", "delete.brewsMany", t) : "",
        gt(counts.observations) ? fragment(counts.observations!, "delete.notesOne", "delete.notesMany", t) : "",
      ].filter(Boolean);
      return {
        title: t("delete.coffee.title"),
        body: compose(parts, "delete.coffee.tail", t),
        confirm: t("coffee.delete"),
      };
    }
    case "brew": {
      const parts = [
        gt(counts.observations) ? fragment(counts.observations!, "delete.notesOne", "delete.notesMany", t) : "",
        gt(counts.tastings) ? fragment(counts.tastings!, "delete.tastingsOne", "delete.tastingsMany", t) : "",
        gt(counts.pours) ? fragment(counts.pours!, "delete.poursOne", "delete.poursMany", t) : "",
      ].filter(Boolean);
      return {
        title: t("brew.delete.title"),
        body: compose(parts, "delete.brew.tail", t),
        confirm: t("brew.delete.confirm"),
      };
    }
    case "session": {
      const parts = [
        gt(counts.brews) ? fragment(counts.brews!, "delete.brewsOne", "delete.brewsMany", t) : "",
      ].filter(Boolean);
      return {
        title: t("delete.session.title"),
        body: compose(parts, "delete.session.tail", t),
        confirm: t("session.delete"),
      };
    }
    case "cupping":
      // No counts: the cupping dialog has no deletion fragments to compose.
      return {
        title: t("delete.cupping.title"),
        body: t("delete.cupping.body"),
        confirm: t("cupping.delete"),
      };
  }
}
