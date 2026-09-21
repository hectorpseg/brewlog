import Link from "next/link";
import { Card } from "./ui/controls";

// First-use empty state: teach + primary action, never bare "No data."
export function EmptyState({ title, body, actionHref, actionLabel }: {
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <Card>
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-sm text-ink2">{body}</p>
      <Link
        href={actionHref}
        className="mt-3 inline-block min-h-11 rounded-[10px] bg-ember px-4 py-2 font-medium text-white"
      >
        {actionLabel}
      </Link>
    </Card>
  );
}

// Recoverable error: what happened + what to do + where to go.
export function ErrorState({ title, body, backHref, backLabel }: {
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Card>
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-sm text-ink2">{body}</p>
      <Link
        href={backHref}
        className="mt-3 inline-block min-h-11 rounded-[10px] border border-line px-4 py-2 font-medium"
      >
        {backLabel}
      </Link>
    </Card>
  );
}

// Loading skeleton matching the card layout it replaces.
export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-20 w-full" />
      ))}
    </div>
  );
}
