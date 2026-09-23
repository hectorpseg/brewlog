import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/require-user";
import { listBrewOptions } from "@/lib/db/queries";
import { toCompareOption } from "@/lib/domain/brew-diff";
import { BackLink } from "@/components/back-link";
import { CompareShell } from "@/components/compare-shell";

// ponytail: the selector dataset lives in the layout, which Next.js preserves
// across ?a=&b= navigations. Changing a dropdown re-runs only the page
// (two targeted getBrew reads), never this 50-row list again.
export default async function CompareLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/brews/compare");
  const rows = await listBrewOptions().catch(() => []);
  const brews = rows.map(toCompareOption);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/brews" label="Brews" />
        <h1 className="font-display text-2xl">Compare brews</h1>
      </div>
      <Suspense fallback={null}>
        <CompareShell brews={brews}>{children}</CompareShell>
      </Suspense>
    </div>
  );
}
