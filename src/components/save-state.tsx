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

// ponytail: one dot color per state so the badge reads at a glance, still
// text-first (never color-only). Inline in the page flow: it never covers
// the bottom nav, the Brew button, the keyboard, or form controls. "Saved"
// renders only after a confirmed sync or a clean mount — never speculatively.
const DOT: Record<SaveState, string> = {
  editing: "bg-ink3",
  saving: "animate-pulse bg-ember",
  saved: "bg-green-700",
  "local-draft": "bg-ink3",
  error: "bg-ember",
};

// Tiny inline badge. Error state carries an explicit Retry tap — never
// color-only, never auto-dismissed; success ("Saved") needs no action.
export function SaveStateBadge({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  return (
    <span
      aria-live="polite"
      title={state === "local-draft" ? "Stored on this device, not yet synced" : LABEL[state]}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 text-xs",
        state === "error" ? "border-ember text-ember" : "text-ink2",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[state])} />
      {state === "error" ? (
        <>
          Sync failed
          {onRetry ? (
            <button type="button" onClick={onRetry} className="-my-2 min-h-11 px-1.5 font-medium underline">
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
