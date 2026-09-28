"use client";
import { CuppingForm, type CuppingRow } from "./cupping-editor";
import { DeleteButton } from "./delete-button";
import { EntityDisclosure } from "./entity-card";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatCuppingSummary } from "@/lib/domain/cupping-summary";
import { describeDeletion } from "@/lib/domain/deletion";
import { CopySummaryButton } from "@/components/copy-summary";

export type CuppingListItem = {
  cupping: CuppingRow;
  coffeeId: string;
  coffeeName: string;
  edit: (formData: FormData) => Promise<void>;
  remove: () => Promise<void>;
};

// Row renderer over the server-paged items: search/filter/sort/pagination
// all ran server-side; the page decides empty states. Edit/remove are bound
// server actions built by the page — this component only renders.
export function CuppingList({ items }: { items: CuppingListItem[] }) {
  return (
    <div>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((i) => {
          const cdel = describeDeletion("cupping", {});
          return (
            <li key={i.cupping.id}>
              <EntityDisclosure
                summary={
                  <>
                    <span className="font-medium">
                      {i.coffeeName} · {i.cupping.dose_g ?? "?"} g / {i.cupping.water_g ?? "?"} g
                    </span>
                    <span className="shrink-0 text-xs text-ink3">{formatBrewDate(i.cupping.cupped_at)}</span>
                  </>
                }
              >
                <CuppingForm action={i.edit} cupping={i.cupping} submitLabel="Save cupping" idPrefix={`cup-${i.cupping.id}`} />
                <CopySummaryButton
                  text={formatCuppingSummary({ cupping: i.cupping as Record<string, unknown>, coffeeName: i.coffeeName })}
                />
                <DeleteButton
                  label="Delete cupping"
                  title={cdel.title}
                  body={cdel.body}
                  confirmLabel={cdel.confirm}
                  action={i.remove}
                />
              </EntityDisclosure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
