"use client";
import { ChevronRight } from "lucide-react";
import { useListNav } from "./list-controls";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { useLocale, useT } from "@/lib/i18n/client";
import type { CuppingRow } from "./cupping-editor";

export type CuppingCardData = {
  cupping: CuppingRow;
  coffeeId: string;
  coffeeName: string;
};

// Compact cupping card: whole card opens the detail, no per-card actions.
// Mirrors CoffeeCard language.
export function CuppingCard({ cupping, coffeeName }: CuppingCardData) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="relative rounded-[10px] border border-line bg-card px-3 py-2 transition-transform hover:bg-paper active:scale-[0.99]">
      <a
        href={`/cuppings/${cupping.id}`}
        aria-label={`${t("cupping.openAria")} ${coffeeName}`}
        className="absolute inset-0 rounded-[10px]"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display text-base leading-snug text-ink line-clamp-1">{coffeeName}</div>
        </div>
        <ChevronRight size={16} aria-hidden className="shrink-0 text-ink3" />
      </div>
      <div className="tnum mt-0.5 text-xs text-ink2 line-clamp-1">
        {cupping.dose_g ?? "?"} g / {cupping.water_g ?? "?"} g
      </div>
      <div className="text-[11px] text-ink3 line-clamp-1">
        {formatBrewDate(cupping.cupped_at, locale)}
      </div>
    </div>
  );
}

// Skeleton matching the compact cupping card.
export function CuppingListSkeleton() {
  const t = useT();
  return (
    <div className="mt-3 flex flex-col gap-2" role="status" aria-label={t("cupping.loading")}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-[10px] border border-line bg-card px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="skeleton h-4 w-2/5" />
            <div className="skeleton h-4 w-4" />
          </div>
          <div className="skeleton mt-1.5 h-3 w-1/3" />
          <div className="skeleton mt-1 h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function CuppingList({ rows, children }: { rows: CuppingCardData[]; children?: React.ReactNode }) {
  const { isPending } = useListNav();
  if (isPending) return <CuppingListSkeleton />;
  if (rows.length === 0) return <div className="mt-2">{children}</div>;
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {rows.map((c) => (
        <li key={c.cupping.id}>
          <CuppingCard cupping={c.cupping} coffeeId={c.coffeeId} coffeeName={c.coffeeName} />
        </li>
      ))}
    </ul>
  );
}
