"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Ellipsis, FlaskConical, Package, Plus } from "lucide-react";
import { cn } from "./ui/utils";

// Compact mobile nav: entities touched mid-brew stay one tap away
// (Brews, Coffees, Cuppings); everything else lives under More.
// + Brew stays the primary creation action. Lucide icons, no emoji.
const TABS = [
  { href: "/brews", label: "Brews", Icon: Coffee },
  { href: "/coffees", label: "Coffees", Icon: Package },
  { href: "/cuppings", label: "Cuppings", Icon: FlaskConical },
];

const MORE_PREFIXES = ["/more", "/sessions", "/account", "/experiments"];

export function BottomNav() {
  const path = usePathname();
  const active = TABS.find((t) => path === t.href || path.startsWith(`${t.href}/`));
  const onMore = MORE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-line bg-card px-4 pb-[env(safe-area-inset-bottom)] pt-2"
    >
      <div className="flex items-center justify-around">
        {TABS.map(({ href, label, Icon }) => (
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
