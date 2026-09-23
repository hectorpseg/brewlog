import Link from "next/link";
import { Layers, Scale, User } from "lucide-react";
import { requireUser } from "@/lib/supabase/require-user";

// Overflow index for destinations used before/after brewing rather than
// mid-brew. Keeps the bottom bar at five slots.
const LINKS = [
  { href: "/sessions", label: "Sessions", body: "Group brews into explorations and phases.", Icon: Layers },
  { href: "/brews/compare", label: "Compare brews", body: "Side-by-side recipe and cup differences.", Icon: Scale },
  { href: "/account", label: "Account", body: "Sign-in and competition target.", Icon: User },
];

export default async function MorePage() {
  await requireUser("/more");
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl">More</h1>
      <ul className="flex flex-col gap-2">
        {LINKS.map(({ href, label, body, Icon }) => (
          <li key={href}>
            <Link href={href} className="block min-h-11 rounded-[10px] border border-line bg-card px-3 py-2 active:scale-[0.99]">
              <div className="flex items-center gap-2 font-medium">
                <Icon size={18} aria-hidden className="shrink-0 text-ink2" />
                {label}
              </div>
              <div className="mt-0.5 pl-7 text-sm text-ink2">{body}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
