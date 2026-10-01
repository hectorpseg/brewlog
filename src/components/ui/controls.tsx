"use client";
import { ButtonHTMLAttributes, forwardRef, TextareaHTMLAttributes, useLayoutEffect, useRef } from "react";
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
  "min-h-11 w-full max-w-full rounded-[10px] border border-line bg-card px-3 py-2 text-base text-ink placeholder:text-ink3 transition-colors focus:border-ember disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink3 read-only:bg-paper read-only:text-ink2";

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

// Shared note/observation textarea: starts at ~4 lines on mobile, then
// auto-grows with the content (type, paste, wrap, delete all re-measure) so
// there is never an internal scrollbar during normal entry. max-h-80 caps
// extreme notes; after that the box scrolls normally. Reruns on controlled
// value changes so restored drafts render fully expanded.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean | string }>(
  ({ className, error, value, onInput, ...p }, ref) => {
    const inner = useRef<HTMLTextAreaElement | null>(null);
    // collapse to auto, then apply content height as a border-box height
    // (offsetHeight - clientHeight = the border pair) so nothing clips
    const resize = (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    };
    useLayoutEffect(() => {
      resize(inner.current);
    }, [value]);
    return (
      <textarea
        ref={(el) => {
          inner.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        value={value}
        onInput={(e) => {
          resize(e.currentTarget);
          onInput?.(e);
        }}
        aria-invalid={error ? "true" : undefined}
        className={cn(fieldCls, "min-h-28 max-h-80 resize-none overflow-y-auto", className, error && errorCls)}
        {...p}
      />
    );
  },
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

// Compact inline boolean toggle (the PourEditor MeloDrip pattern):
// aria-pressed, ember fill when on, small enough to never read as a primary
// action. min-h-9 keeps a usable touch target.
export function Toggle({ label, pressed, onToggle, className }: { label: string; pressed: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "min-h-9 rounded-[10px] border px-3 py-1 text-xs font-medium transition-transform active:scale-[0.96]",
        pressed ? "border-ember bg-ember text-white" : "border-line bg-card text-ink2",
        className,
      )}
    >
      {label}
    </button>
  );
}

// Compact inline labeled switch for brew-level booleans (Selected beans,
// LilyDrip, Hario Switch): label first, 36x20 track + 16px thumb grouped
// behind it. Compact by design (min-h-9, self-start) so it never stretches
// to grid-row height or adds its own vertical rhythm; the full row is the
// touch target. Callers wanting a full-width row (Selected beans) pass
// w-full justify-end. Ember track when on; aria-pressed preserved.
export function Switch({ label, pressed, onToggle, disabled, className }: { label: string; pressed: boolean; onToggle: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex min-h-9 items-center self-start gap-2.5 py-1 text-sm font-medium text-ink2",
        disabled && "opacity-50",
        className,
      )}
    >
      {label}
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150",
          pressed ? "border-ember bg-ember" : "border-line bg-ink3/30",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-150",
            pressed && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
