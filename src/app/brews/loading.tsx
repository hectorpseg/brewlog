import { CardSkeleton } from "@/components/states";
import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <div>
      <div className="skeleton mb-4 h-8 w-32" />
      <div className="skeleton mb-3 h-11 w-full" />
      <div className="skeleton mb-3 h-11 w-40" />
      <CardSkeleton label={t("brews.loading")} />
    </div>
  );
}
