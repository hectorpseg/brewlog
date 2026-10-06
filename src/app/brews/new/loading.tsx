import { CardSkeleton } from "@/components/states";
import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <div>
      <div className="skeleton mb-3 h-8 w-32" />
      <div className="skeleton mb-4 h-20 w-48" />
      <CardSkeleton label={t("list.loading")} />
    </div>
  );
}
