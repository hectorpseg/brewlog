"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { EntityCard } from "./entity-card";
import { NoMatches, SearchField } from "./search-field";
import { matchCoffee } from "@/lib/domain/search";

export type CoffeeListRow = {
  id: string;
  name: string;
  origin: string | null;
  process: string | null;
  notes: string | null;
  remaining_weight_g: number | null;
};

// Client-side filter over the single server-loaded coffee list.
export function CoffeeList({ coffees }: { coffees: CoffeeListRow[] }) {
  const [query, setQuery] = useState("");
  const visible = coffees.filter((c) => matchCoffee(c, query));
  return (
    <div>
      <SearchField
        id="coffee-search"
        label="Search coffees"
        placeholder="Name, origin, process…"
        value={query}
        onChange={setQuery}
      />
      {visible.length === 0 ? (
        <div className="mt-2">
          <NoMatches query={query} onClear={() => setQuery("")} />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {visible.map((c) => (
            <li key={c.id}>
              <EntityCard href={`/coffees/${c.id}`} label={`${c.name} - view and edit`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="tnum text-sm text-ink2">
                      {c.remaining_weight_g != null ? `~${c.remaining_weight_g} g remaining` : "remaining unknown"}
                    </div>
                  </div>
                  <ChevronRight size={20} aria-hidden className="shrink-0 text-ink3" />
                </div>
              </EntityCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
