"use client";
import type { SaveState } from "@/lib/drafts/store";
import { cn } from "./ui/utils";

const LABEL: Record<SaveState, string> = {
  editing: "Editing",
  saving: "Saving…",
  saved: "Saved",
  "local-draft": "Saved locally",
  error: "Sync failed",
};

// Pill badge. Error state carries an explicit Retry tap — never color-only,
// never auto-dismissed; success ("Saved") needs no action.
export function SaveStateBadge({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm",
        state === "error" ? "border-ember text-ember" : "text-ink2",
      )}
    >
      {state === "error" ? (
        <>
          <span aria-hidden>●</span> Sync failed
          {onRetry ? (
            <button type="button" onClick={onRetry} className="min-h-8 font-medium underline">
              Retry
            </button>
          ) : null}
        </>
      ) : (
        LABEL[state]
      )}
    </span>
  );
}
