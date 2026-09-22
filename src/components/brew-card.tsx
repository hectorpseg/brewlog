"use client";
import { formatRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { brewLifecycle, brewWarnings, BREW_LIFECYCLE_LABEL } from "@/lib/domain/brew-status";
import { EntityCard } from "./entity-card";
import { cn } from "./ui/utils";

export type BrewCardData = {
  id: string;
  dose_g: number | null;
  water_g: number | null;
  temp_c: number | null;
  grind_clicks: number | null;
  total_time_sec?: number | null;
  filter?: string | null;
  brewed_at?: string | null;
  created_at?: string | null;
  session_id?: string | null;
  session?: { title: string } | null;
  coffees?: { name: string } | null;
  observations?: unknown;
};

// Notebook entry: date first, ratio as the hero numeral, then recipe context,
// then one quiet status line. Optional action node (e.g. Remove) renders as a
// sibling — never nested inside the link.
export function BrewCard({ brew, action, showCoffee = true }: {
  brew: BrewCardData;
  action?: React.ReactNode;
  showCoffee?: boolean;
}) {
  const dose = Number(brew.dose_g);
  const water = Number(brew.water_g);
  const status = brewLifecycle(brew, brew.observations as Record<string, unknown> | null | undefined);
  const warnings = brewWarnings(brew);
  const coffeeName = Array.isArray(brew.coffees) ? brew.coffees[0]?.name : brew.coffees?.name;
  return (
    <div>
      <EntityCard href={`/brews/${brew.id}`} label={`Brew ${formatRatio(dose, water)}`}>
          <div className="tnum text-xs text-ink3">{formatBrewDate(brew.brewed_at ?? brew.created_at)}</div>
          <div className="font-display text-3xl leading-none">{formatRatio(dose, water)}</div>
          <div className="tnum mt-1 text-sm text-ink2">
            {brew.dose_g ?? "?"} g / {brew.water_g ?? "?"} g
            {showCoffee && coffeeName ? ` · ${coffeeName}` : ""}
          </div>
          <div className="tnum mt-0.5 text-sm text-ink2">
            {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} clicks
            {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
            {brew.filter ? ` · ${brew.filter}` : ""}
          </div>
          {brew.session ? (
            <div className="mt-0.5 text-sm text-ink2">Session · {brew.session.title}</div>
          ) : null}
          <div className={cn("mt-0.5 text-sm", status === "in-progress" ? "text-ember" : "text-ink2")}>
            {BREW_LIFECYCLE_LABEL[status]}
            {warnings.length > 0 ? ` · ${warnings.join(" · ")}` : ""}
          </div>
      </EntityCard>
      {action}
    </div>
  );
}
