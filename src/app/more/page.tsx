import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { MORE_LINKS } from "@/lib/navigation";
import { getT } from "@/lib/i18n/server";

// Overflow index for destinations used before/after brewing rather than
// mid-brew. Keeps the bottom bar at five slots.
export default async function MorePage() {
  await requireUser("/more");
  const t = await getT();
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl">{t("nav.more")}</h1>
      <ul className="flex flex-col gap-2">
        {MORE_LINKS.map(({ href, labelKey, bodyKey, Icon }) => (
          <li key={href}>
            <Link href={href} className="block min-h-11 rounded-[10px] border border-line bg-card px-3 py-2 active:scale-[0.99]">
              <div className="flex items-center gap-2 font-medium">
                <Icon size={18} aria-hidden className="shrink-0 text-ink2" />
                {t(labelKey)}
              </div>
              <div className="mt-0.5 pl-[38px] text-sm text-ink2">{t(bodyKey)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
