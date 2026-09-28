import Link from "next/link";
import type { RecentItem } from "@/lib/domain/recent-views";

// Compact "continue where you left off" strip for /brews: one small card
// per recent item, horizontal scroll, plain links reusing card tokens —
// no new card system. Hidden when empty (new users see nothing).
const KIND_LABEL = { brew: "Brew", coffee: "Coffee", session: "Session" } as const;

export function RecentlyViewed({ items }: { items: RecentItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Recently viewed" className="mb-4">
      <h2 className="text-sm font-medium text-ink2">Recently viewed</h2>
      <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
        {items.map((i) => (
          <Link
            key={`${i.type}:${i.id}`}
            href={i.href}
            className="min-h-11 w-40 shrink-0 rounded-[10px] border border-line bg-card px-3 py-1.5 active:scale-[0.99]"
          >
            <span className="block text-[11px] text-ink3">{KIND_LABEL[i.type]}</span>
            <span className="block truncate text-sm font-medium">{i.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
