"use client";
import { useFormStatus } from "react-dom";
import { Button } from "./ui/controls";

// Submit button for server-action forms: disabled with a saving label while
// the action runs, matching the brew form's isSubmitting behavior. Must
// render inside the <form> it submits.
export function SaveButton({ label, savingLabel }: { label: string; savingLabel?: string }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? (savingLabel ?? "Saving…") : label}</Button>;
}
