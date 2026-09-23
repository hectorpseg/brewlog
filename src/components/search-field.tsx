"use client";
import { Search, X } from "lucide-react";
import { Button, Input, Label } from "./ui/controls";

// Shared list search: labeled, 44px, immediate, with an explicit clear.
// Filtering itself stays in the parent (local rows, no requests).
export function SearchField({ id, label, placeholder, value, onChange }: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="mt-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
        <Input
          id={id}
          type="search"
          role="searchbox"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10"
        />
        {value !== "" ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => onChange("")}
            className="absolute right-1 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-ink2 active:scale-[0.97]"
          >
            <X size={18} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Records exist but nothing matches: explain + clear, never the first-use CTA.
export function NoMatches({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="rounded-[10px] border border-line bg-card px-3 py-4 text-center">
      <p className="text-sm font-medium">No matches for “{query}”.</p>
      <p className="mt-0.5 text-sm text-ink2">Try a different word, or clear the search.</p>
      <div className="mt-3">
        <Button variant="ghost" onClick={onClear}>
          Clear search
        </Button>
      </div>
    </div>
  );
}
