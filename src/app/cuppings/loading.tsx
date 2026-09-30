import { CardSkeleton } from "@/components/states";
import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <div>
      <div className="skeleton mb-4 h-8 w-32" />
      <CardSkeleton label={t("cupping.loading")} />
    </div>
  );
}
