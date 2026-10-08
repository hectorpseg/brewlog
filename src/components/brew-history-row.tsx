"use client";
import { Star } from "lucide-react";
import { formatRatio } from "@/lib/domain/ratio";
import { actualWaterG } from "@/lib/domain/brew-water";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatBrewScore } from "@/lib/domain/brew-score";
import { brewLifecycle, brewWarningKeys, BREW_LIFECYCLE_KEY } from "@/lib/domain/brew-status";
import { EntityCard } from "./entity-card";
import { useLocale, useT } from "@/lib/i18n/client";
import { cn } from "./ui/utils";

// Compact journal row for coffee history: one glanceable line per brew plus a
// quiet status line. Tapping opens the full brew detail. Deliberately smaller
// than BrewCard - no duplicated coffee context, no hero numeral.
export function BrewHistoryRow({ brew, coffeeName, brewScore }: {
  brew: {
    id: string;
    dose_g: number | null;
    water_g: number | null;
    poured_total_g?: number | null;
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
  const t = useT();
  const locale = useLocale();
  const status = brewLifecycle(brew, brew.observations as Record<string, unknown> | null | undefined);
  const warnings = brewWarningKeys(brew).map((k) => t(k));
  const score = typeof brewScore === "number" || typeof brewScore === "string" ? Number(brewScore) : NaN;
  const scored = Number.isFinite(score);
  // ratio and the water number reflect actual brew water (poured total when
  // structured pours exist); planned water lives on the detail page
  const actualWater = actualWaterG(brew.water_g, brew.poured_total_g);
  const ratio = formatRatio(Number(brew.dose_g), actualWater ?? NaN);
  return (
    <EntityCard
      href={`/brews/${brew.id}`}
      label={`${t("brew.titleFallback")} ${ratio}`}
      className="px-4 py-3"
    >
      <div className="tnum flex items-baseline justify-between gap-2 text-sm">
        <span className="font-display text-base">{ratio}</span>
        <span className="shrink-0 text-xs text-ink3">{formatBrewDate(brew.brewed_at ?? brew.created_at, locale)}</span>
      </div>
      <div className="tnum mt-1 text-sm text-ink2 line-clamp-2">
        {brew.dose_g ?? "?"} g / {actualWater ?? "?"} g · {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} {t("brew.clicks")}
        {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
        {brew.filter ? ` · ${brew.filter}` : ""}
        {coffeeName ? ` · ${coffeeName}` : ""}
        {brew.session ? ` · ${brew.session.title}` : ""}
      </div>
      {scored ? (
        <div className="tnum mt-1 flex items-center gap-1 text-xs text-ink2">
          <Star size={12} aria-hidden fill="currentColor" className="text-ink3" />
          <span>{t("brew.scoreLabel")} {formatBrewScore(score)}</span>
        </div>
      ) : null}
      <div className={cn("mt-1 text-xs", status === "in-progress" ? "text-ember" : "text-ink2")}>
        {t(BREW_LIFECYCLE_KEY[status])}
        {warnings.length > 0 ? ` · ${warnings.join(" · ")}` : ""}
      </div>
    </EntityCard>
  );
}
