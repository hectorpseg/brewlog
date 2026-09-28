"use client";
import { Star } from "lucide-react";
import { formatRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatBrewScore } from "@/lib/domain/brew-score";
import { brewLifecycle, brewWarnings, BREW_LIFECYCLE_LABEL } from "@/lib/domain/brew-status";
import { EntityCard } from "./entity-card";
import { cn } from "./ui/utils";

// Compact journal row for coffee history: one glanceable line per brew plus a
// quiet status line. Tapping opens the full brew detail. Deliberately smaller
// than BrewCard — no duplicated coffee context, no hero numeral.
// The same row doubles as the Brew list compact density: pass coffeeName and
// brewScore there (both already on the brews_list row) so scanning keeps the
// identity and rating that coffee history gets from its surrounding context.
export function BrewHistoryRow({ brew, coffeeName, brewScore }: {
  brew: {
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
    observations?: unknown;
  };
  coffeeName?: string | null;
  brewScore?: unknown;
}) {
  const status = brewLifecycle(brew, brew.observations as Record<string, unknown> | null | undefined);
  const warnings = brewWarnings(brew);
  const score = typeof brewScore === "number" || typeof brewScore === "string" ? Number(brewScore) : NaN;
  const scored = Number.isFinite(score);
  return (
    <EntityCard
      href={`/brews/${brew.id}`}
      label={`Brew ${formatRatio(Number(brew.dose_g), Number(brew.water_g))}`}
    >
      <div className="tnum flex items-baseline justify-between gap-2 text-sm">
        <span className="font-display text-base">{formatRatio(Number(brew.dose_g), Number(brew.water_g))}</span>
        <span className="shrink-0 text-xs text-ink3">{formatBrewDate(brew.brewed_at ?? brew.created_at)}</span>
      </div>
      <div className="tnum mt-0.5 text-sm text-ink2">
        {brew.dose_g ?? "?"} g / {brew.water_g ?? "?"} g · {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} clicks
        {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
        {brew.filter ? ` · ${brew.filter}` : ""}
        {coffeeName ? ` · ${coffeeName}` : ""}
        {brew.session ? ` · ${brew.session.title}` : ""}
      </div>
      {scored ? (
        <div className="tnum mt-0.5 flex items-center gap-1 text-xs text-ink2">
          <Star size={12} aria-hidden fill="currentColor" />
          <span>Score {formatBrewScore(score)}</span>
        </div>
      ) : null}
      <div className={cn("mt-0.5 text-xs", status === "in-progress" ? "text-ember" : "text-ink2")}>
        {BREW_LIFECYCLE_LABEL[status]}
        {warnings.length > 0 ? ` · ${warnings.join(" · ")}` : ""}
      </div>
    </EntityCard>
  );
}
