"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/components/ui/utils";
import { useT } from "@/lib/i18n/client";
import type { RecentItem } from "@/lib/domain/recent-views";

// Compact "continue where you left off" strip for /brews: one tiny card per
// recent item, horizontal scroll, plain links reusing card tokens — no new
// card system. Hidden when empty (new users see nothing). Subordinate to the
// brew list: type label + one identifying line, nothing more. Mouse drag is
// enabled for desktop pointer users; touch keeps native horizontal scrolling.
const KIND_KEY = { brew: "recent.brew", coffee: "recent.coffee", session: "recent.session" } as const;
const DRAG_THRESHOLD = 4;

export function RecentlyViewed({ items }: { items: RecentItem[] }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <section aria-label={t("recent.title")} className="mb-2">
      <h2 className="text-[11px] font-medium tracking-wide text-ink3 uppercase">{t("recent.title")}</h2>
      <DraggableStrip items={items} />
    </section>
  );
}

function DraggableStrip({ items }: { items: RecentItem[] }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; scrollLeft: number; moved: boolean; dragging: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    ref.current.setPointerCapture(e.pointerId);
    drag.current = {
      startX: e.clientX,
      scrollLeft: ref.current.scrollLeft,
      moved: false,
      dragging: true,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current?.dragging || !ref.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD) drag.current.moved = true;
    ref.current.scrollLeft = drag.current.scrollLeft - dx;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (ref.current) ref.current.releasePointerCapture(e.pointerId);
    if (drag.current) drag.current.dragging = false;
    setDragging(false);
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
    drag.current = null;
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClickCapture={onClickCapture}
      className={cn(
        "no-scrollbar mt-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-0.5 select-none",
        dragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      {items.map((i) => (
        <Link
          key={`${i.type}:${i.id}`}
          href={i.href}
          className="min-h-[42px] w-[132px] shrink-0 snap-start rounded-[6px] border border-line bg-card px-2 py-1 transition-transform duration-150 active:scale-[0.97]"
        >
          <span className="block text-[9px] leading-tight text-ink3">{t(KIND_KEY[i.type])}</span>
          <span className="block truncate text-[11px] leading-tight font-medium text-ink2">{i.title}</span>
        </Link>
      ))}
    </div>
  );
}


