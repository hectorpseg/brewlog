"use client";

// ponytail: anchor links only, no scroll JS, no active-section tracking.
// Native sticky + horizontal scroll covers the long brew workflow.
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="Brew sections"
      className="sticky top-0 z-10 -mx-4 overflow-x-auto bg-paper/95 px-4 py-1.5 backdrop-blur"
    >
      <div className="flex gap-1">
        {items.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 py-1 text-sm text-ink2 underline-offset-4 hover:text-ink hover:underline"
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

// One-line tasting semantics, shared by new-brew and editor so the wording
// cannot drift between the two.
export function TastingDisclaimer() {
  return (
    <p className="text-xs text-ink2">
      Scores 1-10 are your own enjoyment (higher means you liked it more), not an
      objective maximum. Not an official SCA score. For attributes like body,
      higher means you enjoyed it more, not that the coffee objectively had more of it.
    </p>
  );
}
