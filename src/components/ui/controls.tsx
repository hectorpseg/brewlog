import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./utils";

const R = "rounded-[10px]";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }>(
  ({ className, variant = "primary", ...p }, ref) => (
    <button
      ref={ref}
      className={cn(
        R,
        "min-h-11 px-4 py-2.5 text-base font-medium transition-transform active:scale-[0.98]",
        "disabled:opacity-50 disabled:active:scale-100",
        variant === "primary" ? "bg-ember text-white" : "border border-line bg-card text-ink",
        className,
      )}
      {...p}
    />
  ),
);
Button.displayName = "Button";

const fieldCls =
  "min-h-11 w-full rounded-[10px] border border-line bg-card px-3 py-2 text-base text-ink placeholder:text-ink3";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn(fieldCls, "tnum", className)} {...p} />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => (
    <select ref={ref} className={cn(fieldCls, className)} {...p} />
  ),
);
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea ref={ref} className={cn(fieldCls, className)} {...p} />
  ),
);
Textarea.displayName = "Textarea";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[10px] border border-line bg-card p-4", className)} {...p} />;
}

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium text-ink2", className)} {...p} />;
}

// Notebook section header: rule + title, no card chrome.
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="border-b border-line pb-1 font-display text-lg">{children}</h2>;
}
