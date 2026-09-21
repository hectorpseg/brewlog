import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./utils";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }>(
  ({ className, variant = "primary", ...p }, ref) => (
    <button
      ref={ref}
      className={cn(
        "min-h-11 rounded-xl px-4 py-2.5 text-base font-medium active:scale-[0.98]",
        variant === "primary" ? "bg-zinc-900 text-white" : "border border-zinc-300",
        className,
      )}
      {...p}
    />
  ),
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn("min-h-11 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base", className)} {...p} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea ref={ref} className={cn("w-full rounded-xl border border-zinc-300 px-3 py-2 text-base", className)} {...p} />
  ),
);
Textarea.displayName = "Textarea";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-zinc-200 bg-white p-4", className)} {...p} />;
}

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium text-zinc-700", className)} {...p} />;
}
