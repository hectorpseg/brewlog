"use client";
import type { SaveState } from "@/lib/drafts/store";

const LABEL: Record<SaveState, string> = {
  editing: "Editing…",
  saving: "Saving…",
  saved: "Saved",
  "local-draft": "Offline — saved locally",
  error: "Sync failed — retrying",
};

export function SaveStateBadge({ state }: { state: SaveState }) {
  return (
    <span aria-live="polite" className="text-sm text-zinc-600">
      {LABEL[state]}
    </span>
  );
}
