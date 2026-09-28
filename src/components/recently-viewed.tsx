import Link from "next/link";
import type { RecentItem } from "@/lib/domain/recent-views";

// Compact "continue where you left off" strip for /brews: one tiny card per
// recent item, horizontal scroll, plain links reusing card tokens — no new
// card system. Hidden when empty (new users see nothing). Subordinate to the
// brew list: type label + one identifying line, nothing more.
const KIND_LABEL = { brew: "Brew", coffee: "Coffee", session: "Session" } as const;

export function RecentlyViewed({ items }: { items: RecentItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Recently viewed" className="mb-3">
      <h2 className="text-xs font-medium text-ink3">Recently viewed</h2>
      <div className="no-scrollbar mt-1 flex gap-1 overflow-x-auto">
        {items.map((i) => (
          <Link
            key={`${i.type}:${i.id}`}
            href={i.href}
            className="min-h-8 w-32 shrink-0 rounded-[6px] border border-line bg-card px-2 py-0.5 active:scale-[0.99]"
          >
            <span className="block text-[9px] leading-tight text-ink3">{KIND_LABEL[i.type]}</span>
            <span className="block truncate text-[11px] leading-tight font-medium text-ink2">{i.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
