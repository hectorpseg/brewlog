import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getCupping } from "@/lib/db/queries";
import { deleteCupping, updateCupping } from "@/app/actions";
import { BackLink } from "@/components/back-link";
import { CopySummaryButton } from "@/components/copy-summary";
import { CuppingForm, type CuppingRow } from "@/components/cupping-editor";
import { DeleteButton } from "@/components/delete-button";
import { describeDeletion } from "@/lib/domain/deletion";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatCuppingSummary } from "@/lib/domain/cupping-summary";

export default async function CuppingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/cuppings/${id}`);
  const raw = await getCupping(id);
  if (!raw) notFound();
  const cupping = raw as CuppingRow;

  const coffee = Array.isArray(raw.coffees) ? raw.coffees[0] : raw.coffees;
  const coffeeId = typeof coffee === "object" && coffee && "id" in coffee ? String(coffee.id) : "";
  const coffeeName = typeof coffee === "object" && coffee && "name" in coffee && typeof coffee.name === "string"
    ? coffee.name
    : "Coffee";

  const edit = updateCupping.bind(null, id, coffeeId);
  const remove = deleteCupping.bind(null, id, coffeeId);
  const del = describeDeletion("cupping", {});
  const summary = formatCuppingSummary({ cupping: raw, coffeeName });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/cuppings" label="Cuppings" />
        <h1 className="font-display text-2xl">
          {coffeeId ? (
            <Link href={`/coffees/${coffeeId}`} className="font-medium text-ember underline">
              {coffeeName}
            </Link>
          ) : (
            coffeeName
          )}
        </h1>
        <p className="tnum mt-1 text-sm text-ink2">
          {cupping.dose_g ?? "?"} g / {cupping.water_g ?? "?"} g · {formatBrewDate(cupping.cupped_at)}
        </p>
      </div>
      <CuppingForm action={edit} cupping={cupping} submitLabel="Save cupping" idPrefix={`cup-${id}`} />
      <div className="flex items-center gap-2">
        <CopySummaryButton text={summary} />
      </div>
      <DeleteButton
        label="Delete cupping"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
