import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getCupping } from "@/lib/db/queries";
import { deleteCupping, updateCupping } from "@/app/actions";
import { BackLink } from "@/components/back-link";
import { CopySummaryButton } from "@/components/copy-summary";
import { CuppingForm, type CuppingRow } from "@/components/cupping-editor";
import { DeleteButton } from "@/components/delete-button";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatCuppingSummary } from "@/lib/domain/cupping-summary";
import { getT, getLocale } from "@/lib/i18n/server";

export default async function CuppingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const locale = await getLocale();
  await requireUser(`/cuppings/${id}`);
  const raw = await getCupping(id);
  if (!raw) notFound();
  const cupping = raw as CuppingRow;

  const coffee = Array.isArray(raw.coffees) ? raw.coffees[0] : raw.coffees;
  const coffeeId = typeof coffee === "object" && coffee && "id" in coffee ? String(coffee.id) : "";
  const coffeeName = typeof coffee === "object" && coffee && "name" in coffee && typeof coffee.name === "string"
    ? coffee.name
    : t("cupping.fallbackName");

  const edit = updateCupping.bind(null, id, coffeeId);
  const remove = deleteCupping.bind(null, id, coffeeId);
  const summary = formatCuppingSummary({ cupping: raw, coffeeName });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/cuppings" label={t("nav.cuppings")} />
        <h1 className="font-display text-2xl leading-snug text-ink">
          {coffeeId ? (
            <Link href={`/coffees/${coffeeId}`} className="text-ember no-underline hover:underline focus-visible:underline underline-offset-4">
              {coffeeName}
            </Link>
          ) : (
            coffeeName
          )}
        </h1>
        <p className="tnum mt-1 text-xs text-ink2">
          {cupping.dose_g ?? "?"} g / {cupping.water_g ?? "?"} g · {formatBrewDate(cupping.cupped_at, locale)}
        </p>
      </div>
      <CuppingForm action={edit} cupping={cupping} submitLabel={t("cupping.save")} idPrefix={`cup-${id}`} />
      <div className="flex items-center gap-2">
        <CopySummaryButton text={summary} />
      </div>
      <DeleteButton
        label={t("cupping.delete")}
        title={t("delete.cupping.title")}
        body={t("delete.cupping.body")}
        confirmLabel={t("cupping.delete")}
        action={remove}
      />
    </div>
  );
}
