import Link from "next/link";

// Compact back affordance for deep pages: one line, parent destination only.
// No breadcrumb trails — this is a phone-first app.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1 py-2 pr-3 text-sm font-medium text-ink2 active:scale-[0.97]"
    >
      <span aria-hidden>‹</span> {label}
    </Link>
  );
}
