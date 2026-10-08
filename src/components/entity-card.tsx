"use client";
import { cn } from "./ui/utils";
import Link from "next/link";

// Shared entity shells: one outer structure for every collection card
// (coffees, brews, cuppings, sessions). Flat 1px line, 10px radius, compact
// padding, press state — per the design brief. Entity-specific metadata lives
// inside; the shell never changes. Optional className tweaks padding without
// changing the shell semantics (coffee-history rows use px-4 py-3).
export function EntityCard({ href, label, className, children }: {
  href: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn("block min-h-11 rounded-[10px] border border-line bg-card px-3 py-2 active:scale-[0.99]", className)}
    >
      {children}
    </Link>
  );
}

// Same shell as a native disclosure for expandable rows (cuppings). Declared
// locally for the coffee-detail screen; summary row is the full-width 44px+
// control, content opens directly beneath with a hairline.
export function EntityDisclosure({ summary, children }: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-[10px] border border-line bg-card">
      <summary className="tnum flex min-h-11 cursor-pointer list-none items-baseline justify-between gap-2 px-4 py-3 transition-colors hover:bg-paper active:bg-paper [&::-webkit-details-marker]:hidden">
        {summary}
      </summary>
      <div className="flex flex-col gap-2 border-t border-line p-3">
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
