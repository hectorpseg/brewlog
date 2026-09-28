"use client";
import Link, { useLinkStatus } from "next/link";
import { ChevronRight, Coffee } from "lucide-react";
import { cn } from "./ui/utils";
import { formatCoffeeListDate } from "@/lib/domain/coffee-meta";
import { copyNextBrewHref } from "@/lib/domain/quick-actions";

export type CoffeeCardData = {
  id: string;
  name: string;
  remaining_weight_g?: number | null;
  received_date?: string | null;
  created_at?: string | null;
};

// Compact coffee card: whole card opens the detail, the brew action sits above
// it at z-10 so taps never leak through. Mirrors BrewCard language.
export function CoffeeCard({ coffee }: { coffee: CoffeeCardData }) {
  return (
    <div className="relative rounded-[10px] border border-line bg-card px-3 py-2 transition-transform hover:bg-paper active:scale-[0.99]">
      <a
        href={`/coffees/${coffee.id}`}
        aria-label={`Open ${coffee.name}`}
        className="absolute inset-0 rounded-[10px]"
      />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display text-base leading-snug text-ink line-clamp-1">{coffee.name}</div>
          <div className="tnum mt-0.5 text-xs text-ink2 line-clamp-1">
            {coffee.remaining_weight_g != null ? `~${coffee.remaining_weight_g} g remaining` : "remaining unknown"}
          </div>
          <div className="text-[11px] text-ink3 line-clamp-1">
            {formatCoffeeListDate(coffee.received_date, coffee.created_at)}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-line pt-1.5">
        <div className="relative z-10">
          <BrewFromThis coffeeId={coffee.id} />
        </div>
        <ChevronRight size={16} aria-hidden className="shrink-0 text-ink3" />
      </div>
    </div>
  );
}

function BrewFromThis({ coffeeId }: { coffeeId: string }) {
  return (
    <Link
      href={copyNextBrewHref(coffeeId)}
      replace
      prefetch={false}
      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ember/40 bg-ember/5 px-2.5 py-1 text-xs font-medium text-ember transition-transform duration-150 active:scale-[0.97]"
    >
      <Coffee size={13} aria-hidden />
      <BrewFromThisLabel />
    </Link>
  );
}

function BrewFromThisLabel() {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("pointer-events-none", pending && "opacity-40")} aria-hidden={pending}>
      Brew from this
    </span>
  );
}

// Skeleton matching the compact coffee card it replaces.
export function CoffeeListSkeleton() {
  return (
    <div className="mt-3 flex flex-col gap-2" role="status" aria-label="Loading coffees">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-[10px] border border-line bg-card px-3 py-2">
          <div className="skeleton h-4 w-2/5" />
          <div className="skeleton mt-1.5 h-3 w-1/3" />
          <div className="skeleton mt-1 h-3 w-1/2" />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <div className="skeleton h-7 w-28 rounded-full" />
            <div className="skeleton h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
