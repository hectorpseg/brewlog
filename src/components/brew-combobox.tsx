"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { filterBrewOptions, stepActive, type BrewOption } from "@/lib/domain/brew-diff";
import { Input, Label } from "./ui/controls";
import { cn } from "./ui/utils";

// One searchable brew selector: type to filter, arrow to move, Enter to pick,
// Escape to close. Selection is reported up; the shell owns the URL change.
// ponytail: no popover library — a filtered listbox under the input is enough.
export function BrewCombobox({ id, label, brews, value, onSelect }: {
  id: string;
  label: string;
  brews: BrewOption[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-listbox`;

  const selected = brews.find((b) => b.id === value);
  const selectedTitle = selected?.title ?? selected?.label ?? "";
  const options = filterBrewOptions(brews, query, value);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openList() {
    setOpen(true);
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.id === value)));
  }

  function select(option: BrewOption) {
    onSelect(option.id);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      setActive((cur) => stepActive(cur, e.key === "ArrowDown" ? 1 : -1, options.length));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && options[active]) {
        e.preventDefault();
        select(options[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
    }
  }

  const activeId = open && active >= 0 && options[active] ? `${id}-opt-${options[active].id}` : undefined;

  return (
    <div ref={rootRef}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
        <Input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          placeholder={selectedTitle || "Search brews"}
          value={open ? query : selectedTitle}
          onFocus={() => { if (!open) openList(); }}
          onClick={() => { if (!open) openList(); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={onKeyDown}
          className="pl-9 pr-10"
        />
        <ChevronDown
          size={18}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3"
        />
        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[10px] border border-line bg-card p-1 shadow-lg"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink2">No matching brews.</li>
            ) : (
              options.map((o, i) => (
                <li
                  key={o.id}
                  id={`${id}-opt-${o.id}`}
                  role="option"
                  aria-selected={o.id === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(o)}
                  className={cn(
                    "flex min-h-11 cursor-pointer flex-col justify-center rounded-[10px] px-3 py-2",
                    i === active && "bg-paper",
                    o.id === value && "font-medium text-ember",
                  )}
                >
                  <span className="truncate text-base">{o.title ?? o.label}</span>
                  {o.detail ? <span className="tnum truncate text-sm text-ink2">{o.detail}</span> : null}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
