import Link from "next/link";
import { formatRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { brewLifecycle, brewWarnings, BREW_LIFECYCLE_LABEL } from "@/lib/domain/brew-status";
import { cn } from "./ui/utils";

// Compact journal row for coffee history: one glanceable line per brew plus a
// quiet status line. Tapping opens the full brew detail. Deliberately smaller
// than BrewCard — no duplicated coffee context, no hero numeral.
export function BrewHistoryRow({ brew }: {
  brew: {
    id: string;
    dose_g: number | null;
    water_g: number | null;
    temp_c: number | null;
    grind_clicks: number | null;
    total_time_sec?: number | null;
    brewed_at?: string | null;
    created_at?: string | null;
    session_id?: string | null;
    session?: { title: string } | null;
    observations?: unknown;
  };
}) {
  const status = brewLifecycle(brew, brew.observations as Record<string, unknown> | null | undefined);
  const warnings = brewWarnings(brew);
  return (
    <Link
      href={`/brews/${brew.id}`}
      aria-label={`Brew ${formatRatio(Number(brew.dose_g), Number(brew.water_g))}`}
      className="block min-h-11 rounded-[10px] border border-line bg-card px-3 py-2 active:scale-[0.99]"
    >
      <div className="tnum flex items-baseline justify-between gap-2 text-sm">
        <span className="font-display text-base">{formatRatio(Number(brew.dose_g), Number(brew.water_g))}</span>
        <span className="shrink-0 text-xs text-ink3">{formatBrewDate(brew.brewed_at ?? brew.created_at)}</span>
      </div>
      <div className="tnum mt-0.5 text-sm text-ink2">
        {brew.dose_g ?? "?"} g / {brew.water_g ?? "?"} g · {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} clicks
        {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
        {brew.session ? ` · ${brew.session.title}` : ""}
      </div>
      <div className={cn("mt-0.5 text-xs", status === "in-progress" ? "text-ember" : "text-ink2")}>
        {BREW_LIFECYCLE_LABEL[status]}
        {warnings.length > 0 ? ` · ${warnings.join(" · ")}` : ""}
      </div>
    </Link>
  );
}
