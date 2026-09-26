import { CardSkeleton } from "@/components/states";

// ponytail: root fallback must match per-route skeletons, never the branded
// splash. src/app/loading.tsx is the App Router fallback for every segment
// without its own loading.tsx (/, /login, /more, /cuppings/new,
// /experiments/new), so a splash here fires on ordinary client navigation,
// not just app startup. Route loading = skeleton; iOS launch screen comes
// from the PWA icon + background, not this boundary.
export default function Loading() {
  return (
    <div>
      <div className="skeleton mb-4 h-8 w-32" />
      <CardSkeleton />
    </div>
  );
}
