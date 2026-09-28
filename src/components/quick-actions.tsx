"use client";
import Link from "next/link";
import { Coffee, Copy } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { copyNextBrewHref } from "@/lib/domain/quick-actions";

// ponytail: visible quick actions, one shared row so list/detail surfaces
// converge. Favorite reuses FavoriteButton (no duplicate logic); Copy reuses
// the existing /brews/new?coffee=X&copy=1 flow (no duplicate copy logic);
// Share lives on brew detail via the S8 share card. No gestures: every action
// here is a native button/link, keyboard-accessible, 44px minimum.

export { copyNextBrewHref };

const iconBtn =
  "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-line bg-card active:scale-[0.97]";

// Secondary brew actions beside a list card: favorite toggle + copy as next.
// Copy hides when the coffee is unknown rather than guessing a target.
export function BrewQuickActions({ brewId, coffeeId, isFavorite, toggle }: {
  brewId: string;
  coffeeId: string | null;
  isFavorite: boolean;
  toggle: () => Promise<void>;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <FavoriteButton brewId={brewId} isFavorite={isFavorite} toggle={toggle} />
      {coffeeId ? (
        <Link
          href={copyNextBrewHref(coffeeId)}
          aria-label={`New from this brew ${brewId}`}
          className={iconBtn}
        >
          <Copy size={20} aria-hidden className="text-ink3" />
        </Link>
      ) : null}
    </div>
  );
}

// The one coffee action that earns a list slot: start a brew of this coffee.
// Same copy flow as Brew Again on coffee detail.
export function BrewCoffeeAction({ coffeeId, coffeeName }: {
  coffeeId: string;
  coffeeName: string;
}) {
  return (
    <Link
      href={copyNextBrewHref(coffeeId)}
      aria-label={`Brew ${coffeeName} again`}
      title={`Brew ${coffeeName} again`}
      className={iconBtn}
    >
      <Coffee size={20} aria-hidden className="text-ink3" />
    </Link>
  );
}
