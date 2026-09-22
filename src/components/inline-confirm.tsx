"use client";
import { useState } from "react";
import { Button } from "./ui/controls";

// Lightweight inline confirmation for lower-risk contextual actions.
// Stays on the page: question → [Cancel] [Remove]. No modal, no popup.
export function InlineConfirm({ label, question, confirmLabel, action, children }: {
  label: string;
  question: string;
  confirmLabel: string;
  action: (formData: FormData) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="ghost" className="px-3 py-1 text-sm text-ember" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={action} className="mt-1 flex flex-col gap-2">
      {children}
      <p className="text-sm text-ink2">{question}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button type="submit">{confirmLabel}</Button>
      </div>
    </form>
  );
}
