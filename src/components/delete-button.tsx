"use client";
import { useState } from "react";
import { Button, Card } from "./ui/controls";

// Two-tap destructive action: first tap reveals what dies, second confirms.
// Never a bare icon, never window.confirm, never adjacent to primary actions.
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
      <Button variant="ghost" className="text-ember" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }
  return (
    <Card>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-ink2">{body}</p>
      <form action={action} className="mt-3 flex gap-2">
        <Button>{confirmLabel}</Button>
        <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
          Keep it
        </Button>
      </form>
    </Card>
  );
}
