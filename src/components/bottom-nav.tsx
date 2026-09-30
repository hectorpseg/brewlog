"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Plus } from "lucide-react";
import { isMorePath, isPublicPath, isTabPath, PRIMARY_TABS } from "@/lib/navigation";
import { useT } from "@/lib/i18n/client";
import { cn } from "./ui/utils";

// Auth shell separation lives here, not in a route group: public paths
// (login, root redirect) render no app chrome, so unauthenticated users
// never see authenticated navigation. Everything else is the app shell.
export function BottomNav() {
  const path = usePathname();
  const t = useT();
  if (isPublicPath(path)) return null;
  const onMore = isMorePath(path);
  // More wins over prefix matching: /brews/compare nests under /brews but
  // belongs to More, so the Brews tab must not claim it.
  const active = onMore ? undefined : PRIMARY_TABS.find((tab) => isTabPath(path, tab.href));
  return (
    <nav
      aria-label={t("nav.primary")}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-line bg-card px-4 pb-[env(safe-area-inset-bottom)] pt-2"
    >
      <div className="flex items-center justify-around">
        {PRIMARY_TABS.map(({ href, labelKey, Icon }) => (
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
            <span className="text-[11px] leading-none">{t(labelKey)}</span>
          </Link>
        ))}
        <Link
          href="/brews/new"
          className="flex min-h-11 items-center gap-1 rounded-[10px] bg-ember px-4 py-2 font-medium text-white transition-transform duration-150 active:scale-[0.95]"
        >
          <Plus size={18} aria-hidden />
          {t("nav.newBrew")}
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
          <span className="text-[11px] leading-none">{t("nav.more")}</span>
        </Link>
      </div>
    </nav>
  );
}
