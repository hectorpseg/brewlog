import Link from "next/link";
import { Card } from "./ui/controls";
import { CollectionAction } from "./entity-card";

// First-use empty state: teach + primary action, never bare "No data."
// The action is the shared ember Link CTA (CollectionAction), so empty
// states press like every other collection-level "create" action.
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
      <div className="mt-3">
        <CollectionAction href={actionHref}>{actionLabel}</CollectionAction>
      </div>
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

// Loading skeleton matching the card layout it replaces. `label` lets a
// translated screen name what is loading; default keeps existing callers.
export function CardSkeleton({ label = "Loading" }: { label?: string } = {}) {
  return (
    <div className="flex flex-col gap-2" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-20 w-full" />
      ))}
    </div>
  );
}
