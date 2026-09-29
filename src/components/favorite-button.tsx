"use client";
import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/components/ui/utils";

// Heart toggle for brew rows and detail headers. Optimistic: the heart
// flips instantly, the bound server action persists, revalidation
// settles the truth. 44px target, visible control — never a gesture-only action.
export function FavoriteButton({ isFavorite, toggle }: {
  isFavorite: boolean;
  toggle: () => Promise<void>;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isFavorite);
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? "Remove favorite" : "Favorite this brew"}
      onClick={() => startTransition(async () => {
        setOptimistic(!optimistic);
        await toggle();
      })}
      className="relative z-10 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] text-ink3 transition-all duration-150 hover:bg-line/50 active:scale-[0.92]"
    >
      <Heart
        size={22}
        aria-hidden
        fill={optimistic ? "currentColor" : "none"}
        className={cn("transition-all duration-150", optimistic ? "text-ember" : "text-ink3")}
      />
    </button>
  );
}
