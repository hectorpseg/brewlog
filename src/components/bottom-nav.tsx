"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui/utils";

const TABS = [
  { href: "/brews", label: "Brews" },
  { href: "/coffees", label: "Coffees" },
  { href: "/sessions", label: "Sessions" },
];

// One interaction language: text destinations, one ember action, one quiet
// secondary link. No iconography, no bounce — press states only.
export function BottomNav() {
  const path = usePathname();
  const active = TABS.find((t) => path === t.href || path.startsWith(`${t.href}/`));
  const onAccount = path === "/account" || path.startsWith("/account/");
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-line bg-card px-4 pb-[env(safe-area-inset-bottom)] pt-2"
    >
      <div className="flex items-center justify-around text-base">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active?.href === t.href ? "page" : undefined}
            className={cn(
              "min-h-11 px-3 py-2 transition-colors duration-150 active:scale-[0.97]",
              active?.href === t.href ? "font-semibold text-ink" : "text-ink2",
            )}
          >
            {t.label}
          </Link>
        ))}
        <Link
          href="/brews/new"
          className="min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white transition-transform duration-150 active:scale-[0.95]"
        >
          + Brew
        </Link>
        <Link
          href="/account"
          aria-current={onAccount ? "page" : undefined}
          className={cn(
            "min-h-11 px-3 py-2 text-sm transition-colors duration-150 active:scale-[0.97]",
            onAccount ? "font-semibold text-ink" : "text-ink2",
          )}
        >
          Account
        </Link>
      </div>
    </nav>
  );
}
