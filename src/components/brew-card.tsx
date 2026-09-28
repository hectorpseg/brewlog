import { ChevronRight, Heart } from "lucide-react";
import { formatRatio } from "@/lib/domain/ratio";
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
  favoritePending?: boolean;
  onFavoriteToggle?: () => void;
  action?: React.ReactNode;
};

// Compact brew journal card. The whole card opens the brew (stretched link),
// so internal actions (favorite, New from this) sit above it at z-10 and never
// trigger navigation. Hierarchy: coffee name is the identity, then date/dose/
// ratio, then recipe facts, then status + score. Press feedback is the card
// itself scaling; the favorite button adds its own compact active state so the
// heart's transition feels immediate.
export function BrewCard({ brew, isFavorite, favoritePending, onFavoriteToggle, action }: BrewCardProps) {
  const status = brewLifecycle(brew, brew.observations as Record<string, unknown> | null | undefined);
  const warnings = brewWarnings(brew);
  const coffeeName = Array.isArray(brew.coffees) ? brew.coffees[0]?.name : brew.coffees?.name;
  const score = typeof brew.brew_score === "number" || typeof brew.brew_score === "string" ? Number(brew.brew_score) : NaN;
  const scored = Number.isFinite(score);

  return (
    <div
      className={cn(
        "relative cursor-pointer rounded-[10px] border border-line bg-card px-3 py-2 transition-transform hover:bg-paper active:scale-[0.99]",
        isFavorite && "border-ember",
      )}
    >
      <a
        href={`/brews/${brew.id}`}
        aria-label={`Open brew ${coffeeName || "details"}`}
        className="absolute inset-0 rounded-[10px]"
      />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display text-base leading-snug text-ink line-clamp-1">{coffeeName || "Untitled"}</div>
          <div className="tnum mt-0.5 text-xs text-ink2 line-clamp-1">
            {formatBrewDate(brew.brewed_at ?? brew.created_at)}
            {" · "}
            {brew.dose_g ?? "?"} g → {brew.water_g ?? "?"} g
            {" · "}
            {formatRatio(Number(brew.dose_g), Number(brew.water_g))}
          </div>
          <div className="tnum text-[11px] text-ink3 line-clamp-1">
            {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} clicks
            {brew.filter ? ` · ${brew.filter}` : ""}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink2">
            <span>{BREW_LIFECYCLE_LABEL[status]}</span>
            {scored && (
              <span className="tnum shrink-0">· {formatBrewScore(score)}</span>
            )}
            {warnings.length > 0 && (
              <span className="min-w-0 text-ink3 line-clamp-1">· {warnings.join(" · ")}</span>
            )}
          </div>
        </div>
        {onFavoriteToggle && (
          <button
            type="button"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove favorite" : "Favorite this brew"}
            disabled={favoritePending}
            onClick={onFavoriteToggle}
            className="relative z-10 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] text-ink3 transition-all duration-150 hover:bg-line/50 active:scale-[0.92] disabled:cursor-not-allowed"
          >
            <Heart
              size={22}
              aria-hidden
              fill={isFavorite ? "currentColor" : "none"}
              className={cn("transition-all duration-150", isFavorite ? "text-ember" : "text-ink3")}
            />
          </button>
        )}
      </div>
      {action && (
        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-line pt-1.5">
          <div className="relative z-10">{action}</div>
          <ChevronRight size={16} aria-hidden className="shrink-0 text-ink3" />
        </div>
      )}
    </div>
  );
}
