"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Card } from "./ui/controls";

// Shared destructive pattern: a quiet-but-ember trigger, then an inline
// danger confirmation — "Delete this X?" / "This cannot be undone." /
// [Cancel] [Delete]. Never window.confirm, never a modal, never adjacent to
// primary actions. Every delete in the app uses this component.
export function DeleteButton({ label, title, body, confirmLabel, action }: {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  action: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-ember transition-transform active:scale-[0.97]"
      >
        <Trash2 size={16} aria-hidden />
        {label}
      </button>
    );
  }
  return (
    <Card className="border-ember/40">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-ink2">{body}</p>
      <form action={action} className="mt-3 flex gap-2">
        <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button type="submit">{confirmLabel}</Button>
      </form>
    </Card>
  );
}
