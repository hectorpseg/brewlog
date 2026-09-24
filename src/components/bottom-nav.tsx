"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Plus } from "lucide-react";
import { isMorePath, isPublicPath, isTabPath, PRIMARY_TABS } from "@/lib/navigation";
import { cn } from "./ui/utils";

// Auth shell separation lives here, not in a route group: public paths
// (login, root redirect) render no app chrome, so unauthenticated users
// never see authenticated navigation. Everything else is the app shell.
export function BottomNav() {
  const path = usePathname();
  if (isPublicPath(path)) return null;
  const active = PRIMARY_TABS.find((t) => isTabPath(path, t.href));
  const onMore = isMorePath(path);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-line bg-card px-4 pb-[env(safe-area-inset-bottom)] pt-2"
    >
      <div className="flex items-center justify-around">
        {PRIMARY_TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active?.href === href ? "page" : undefined}
            className={cn(
              "flex min-h-11 min-w-14 flex-col items-center gap-0.5 px-2 py-1 transition-colors duration-150 active:scale-[0.97]",
              active?.href === href ? "font-semibold text-ink" : "text-ink2",
            )}
          >
            <Icon size={20} aria-hidden />
            <span className="text-[11px] leading-none">{label}</span>
          </Link>
        ))}
        <Link
          href="/brews/new"
          className="flex min-h-11 items-center gap-1 rounded-[10px] bg-ember px-4 py-2 font-medium text-white transition-transform duration-150 active:scale-[0.95]"
        >
          <Plus size={18} aria-hidden />
          Brew
        </Link>
        <Link
          href="/more"
          aria-current={onMore ? "page" : undefined}
          className={cn(
            "flex min-h-11 min-w-14 flex-col items-center gap-0.5 px-2 py-1 transition-colors duration-150 active:scale-[0.97]",
            onMore ? "font-semibold text-ink" : "text-ink2",
          )}
        >
          <Ellipsis size={20} aria-hidden />
          <span className="text-[11px] leading-none">More</span>
        </Link>
      </div>
    </nav>
  );
}
