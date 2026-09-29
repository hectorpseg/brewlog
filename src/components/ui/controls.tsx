"use client";
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

// ponytail: one shared field surface — warm line border, card bg, ember focus.
const fieldCls =
  "min-h-11 w-full rounded-[10px] border border-line bg-card px-3 py-2 text-base text-ink placeholder:text-ink3 transition-colors focus:border-ember disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink3 read-only:bg-paper read-only:text-ink2";

const errorCls = "border-ember bg-ember/5";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean | string }>(
  ({ className, type, error, ...p }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={error ? "true" : undefined}
      className={cn(fieldCls, "tnum", className, error && errorCls)}
      {...p}
    />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean | string }>(
  ({ className, error, ...p }, ref) => (
    <select ref={ref} aria-invalid={error ? "true" : undefined} className={cn(fieldCls, "select-field", className, error && errorCls)} {...p} />
  ),
);
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean | string }>(
  ({ className, error, ...p }, ref) => (
    <textarea ref={ref} aria-invalid={error ? "true" : undefined} className={cn(fieldCls, "resize-y", className, error && errorCls)} {...p} />
  ),
);
Textarea.displayName = "Textarea";

export function FieldError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="mt-1 text-sm text-ember">{children}</p>;
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[10px] border border-line bg-card p-4", className)} {...p} />;
}

// Labels in normal casing, matching BrewLog typography (no all-caps/letterspacing).
export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink2", className)} {...p} />;
}

// Notebook section header: rule + title, no card chrome.
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="border-b border-line pb-1 font-display text-lg">{children}</h2>;
}
