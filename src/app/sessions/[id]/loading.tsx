import { CardSkeleton } from "@/components/states";
import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-8 w-48" />
      <CardSkeleton label={t("session.loading")} />
    </div>
  );
}
