"use client";
import { useState } from "react";
import { CuppingForm, type CuppingRow } from "./cupping-editor";
import { DeleteButton } from "./delete-button";
import { EntityDisclosure } from "./entity-card";
import { NoMatches, SearchField } from "./search-field";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { formatCuppingSummary } from "@/lib/domain/cupping-summary";
import { matchCupping } from "@/lib/domain/search";
import { describeDeletion } from "@/lib/domain/deletion";
import { CopySummaryButton } from "@/components/copy-summary";

export type CuppingListItem = {
  cupping: CuppingRow;
  coffeeId: string;
  coffeeName: string;
  edit: (formData: FormData) => Promise<void>;
  remove: () => Promise<void>;
};

// Client-side filter over the single server-loaded cupping list. Edit/remove
// are bound server actions built by the page — this component only filters.
export function CuppingList({ items }: { items: CuppingListItem[] }) {
  const [query, setQuery] = useState("");
  const visible = items.filter((i) =>
    matchCupping({ ...i.cupping, coffeeName: i.coffeeName }, query),
  );
  return (
    <div>
      <SearchField
        id="cupping-search"
        label="Search cuppings"
        placeholder="Coffee, grinder, date, notes…"
        value={query}
        onChange={setQuery}
      />
      {visible.length === 0 ? (
        <div className="mt-2">
          <NoMatches query={query} onClear={() => setQuery("")} />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {visible.map((i) => {
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
      )}
    </div>
  );
}
