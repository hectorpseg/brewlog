"use client";
import Link from "next/link";

// Shared entity shells: one outer structure for every collection card
// (coffees, brews, cuppings, sessions). Flat 1px line, 10px radius, compact
// padding, press state — per the design brief. Entity-specific metadata lives
// inside; the shell never changes.
export function EntityCard({ href, label, children }: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="block min-h-11 rounded-[10px] border border-line bg-card px-3 py-2 active:scale-[0.99]"
    >
      {children}
    </Link>
  );
}

// Same shell as a native disclosure for expandable rows (cuppings).
export function EntityDisclosure({ summary, children }: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-[10px] border border-line bg-card px-3 py-2">
      <summary className="tnum flex min-h-11 cursor-pointer items-baseline justify-between gap-2 py-2 text-sm">
        {summary}
      </summary>
      <div className="mt-2 flex flex-col gap-2 pb-1">
        {children}
      </div>
    </details>
  );
}

// Primary collection action: ember button link. Used for + Brew / + Cupping /
// + Session so every "add to this collection" reads as the same action.
export function CollectionAction({ href, children }: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-block min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white transition-transform duration-150 active:scale-[0.95]"
    >
      {children}
    </Link>
  );
}
