"use client";
import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";

// Heart toggle for brew rows and detail headers. Optimistic: the heart
// flips instantly, the bound server action persists, revalidation
// settles the truth. 44px target, visible control — never a gesture-only action.
export function FavoriteButton({ brewId, isFavorite, toggle }: {
  brewId: string;
  isFavorite: boolean;
  toggle: () => Promise<void>;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isFavorite);
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? `Unfavorite brew ${brewId}` : `Favorite brew ${brewId}`}
      onClick={() => startTransition(async () => {
        setOptimistic(!optimistic);
        await toggle();
      })}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-line bg-card bg-card active:scale-[0.97] fave-btn"
    >
      <Heart
        size={20}
        aria-hidden
        fill={optimistic ? "currentColor" : "none"}
        className={optimistic ? "text-ink" : "text-ink3"}
      />
    </button>
  );
}
