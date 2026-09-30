"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/utils";
import { useT } from "@/lib/i18n/client";

// ponytail: scroll-spy with one RAF listener; no section-tracking library.
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const t = useT();
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const ids = items.map((i) => i.id);
    let raf = 0;

    function update() {
      const navHeight = navRef.current?.getBoundingClientRect().height ?? 0;
      const marker = navHeight + 8;
      let next = ids[0];

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= marker) next = id;
        else break;
      }

      setActiveId((current) => (next !== current ? next : current));
      raf = 0;
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  // Keep the active section visible in the strip: scroll-spy can activate a
  // trailing section (Tasting) while it sits past the horizontal fold.
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('a[aria-current="true"]');
    if (!nav || !el) return;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < nav.scrollLeft) {
      nav.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    } else if (right > nav.scrollLeft + nav.clientWidth - 16) {
      nav.scrollTo({ left: right - nav.clientWidth + 16, behavior: "smooth" });
    }
  }, [activeId]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      ref={navRef}
      aria-label={t("brew.sectionsAria")}
      className="no-scrollbar sticky top-0 z-10 -mx-4 overflow-x-auto bg-paper/95 pl-4 py-1.5 backdrop-blur"
    >
      {/* pr-4 rides on the scrolled content: right padding on an
          overflow-x-auto box is truncated by some engines, which was
          clipping the trailing item. */}
      <div className="flex items-center gap-1 pr-4">
        {items.map((s) => {
          const isActive = activeId === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleClick(e, s.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "relative inline-flex min-h-11 shrink-0 items-center gap-1 px-3 text-xs font-medium text-ink2 no-underline transition-all duration-150",
                isActive && "text-sm font-semibold text-ink"
              )}
            >
              {s.label}
              <span
                className={cn(
                  "inline-flex transition-all duration-150",
                  isActive ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-0.5 opacity-0"
                )}
                aria-hidden="true"
              >
                <svg viewBox="0 0 10 6" className="h-1.5 w-2.5 fill-current">
                  <path d="M0 0L5 6L10 0H0Z" />
                </svg>
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

// One-line tasting semantics, shared by new-brew and editor so the wording
// cannot drift between the two. Soft-blue card reads as guidance, never an error.
export function TastingDisclaimer() {
  const t = useT();
  return (
    <div className="rounded-[10px] bg-info-soft px-3 py-2 text-xs text-ink2 text-justify">
      {t("tasting.disclaimer")}
    </div>
  );
}
