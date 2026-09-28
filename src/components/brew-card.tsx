"use client";
import { Heart } from "lucide-react";
import { formatRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatBrewScore } from "@/lib/domain/brew-score";
import { brewLifecycle, brewWarnings, BREW_LIFECYCLE_LABEL } from "@/lib/domain/brew-status";
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
  brew_score?: unknown;
};

export type BrewCardProps = {
  brew: BrewCardData;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  action?: React.ReactNode;
};

export function BrewCard({ brew, isFavorite, onFavoriteToggle, action }: BrewCardProps) {
  const dose = Number(brew.dose_g);
  const water = Number(brew.water_g);
  const status = brewLifecycle(brew, brew.observations as Record<string, unknown> | null | undefined);
  const warnings = brewWarnings(brew);
  const coffeeName = Array.isArray(brew.coffees) ? brew.coffees[0]?.name : brew.coffees?.name;
  const score = typeof brew.brew_score === "number" || typeof brew.brew_score === "string" ? Number(brew.brew_score) : NaN;
  const scored = Number.isFinite(score);

  return (
    <div
      className={cn(
        "rounded-[10px] border border-line bg-card px-3 py-2",
        isFavorite && "border-ember"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <a
          href={`/brews/${brew.id}`}
          className="min-w-0 flex-1"
          aria-label={`Brew ${coffeeName || "Brew"} details`}
        >
          <div className="text-sm font-medium text-ink1 line-clamp-1">{coffeeName || "Untitled"}</div>

          <div className="text-xs text-ink3 line-clamp-1">
            {formatBrewDate(brew.brewed_at ?? brew.created_at)}
          </div>

          <div className="text-xs text-ink2 line-clamp-1">
            {brew.dose_g ?? "?"} g → {brew.water_g ?? "?"} g · {formatRatio(dose, water)}
          </div>

          <div className="text-[10px] text-ink2 line-clamp-1">
            {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} clicks
            {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
            {brew.filter ? ` · ${brew.filter}` : ""}
          </div>

          {brew.session && (
            <div className="text-[10px] text-ink2">Session · {brew.session.title}</div>
          )}

          {status !== "in-progress" && (
            <div className="text-[10px]">
              {BREW_LIFECYCLE_LABEL[status]}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="text-[10px] text-ink2">
              {warnings.join(" · ")}
            </div>
          )}

          {scored && (
            <div className="mt-1">
              <span className="inline-block rounded-full bg-ember/10 px-2 py-0.5 text-[10px] font-medium text-ember">
                {formatBrewScore(score)}
              </span>
            </div>
          )}
        </a>

        {onFavoriteToggle && (
          <button
            type="button"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remove favorite` : `Favorite this brew`}
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] active:scale-[0.97]"
          >
            <Heart
              size={18}
              aria-hidden
              fill={isFavorite ? "currentColor" : "none"}
              className={isFavorite ? "text-ink" : "text-ink3"}
            />
          </button>
        )}
      </div>

      {action && (
        <div className="mt-2 border-t border-line pt-2">
          {action}
        </div>
      )}
    </div>
  );
}
