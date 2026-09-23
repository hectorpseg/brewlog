"use client";
import { useState } from "react";
import { BrewCard, type BrewCardData } from "./brew-card";
import { NoMatches, SearchField } from "./search-field";
import { matchBrew } from "@/lib/domain/search";

// Client-side filter over the single server-loaded brew list: typing never
// issues a request. Sorting, cards, and status stay exactly as loaded.
export function BrewList({ brews }: { brews: BrewCardData[] }) {
  const [query, setQuery] = useState("");
  const visible = brews.filter((b) => matchBrew(b, query));
  return (
    <div>
      <SearchField
        id="brew-search"
        label="Search brews"
        placeholder="Coffee, session, date, notes…"
        value={query}
        onChange={setQuery}
      />
      {visible.length === 0 ? (
        <div className="mt-2">
          <NoMatches query={query} onClear={() => setQuery("")} />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {visible.map((b) => (
            <li key={b.id}><BrewCard brew={b} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
