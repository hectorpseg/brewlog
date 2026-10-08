"use client";
import Link from "next/link";
import { useState } from "react";
import { updateCoffee } from "@/app/actions";
import { useAutosave } from "@/lib/drafts/useAutosave";
import { draftKey } from "@/lib/drafts/local-store";
import { Card, Input, Label } from "./ui/controls";
import { defaultBrewedDate } from "@/lib/domain/brew-date";
import { SaveStateBadge } from "@/components/save-state";
import { useT } from "@/lib/i18n/client";

// The detail screen is the form: action row on top, fields below, no edit
// gate. Editing autosaves through the shared draft pipeline (local draft
// first, debounced server sync, error badge with retry); coffee creation
// keeps its dedicated one-shot flow on /coffees/new.
type CoffeeField =
  | "name" | "origin" | "process" | "variety" | "producer" | "country"
  | "region" | "farm" | "altitude" | "remainingWeightG" | "receivedDate";
type CoffeeForm = Record<CoffeeField, string>;

function coffeeFormDefaults(coffee: Record<string, unknown>): CoffeeForm {
  return {
    name: String(coffee.name ?? ""),
    origin: String(coffee.origin ?? ""),
    process: String(coffee.process ?? ""),
    variety: String(coffee.variety ?? ""),
    producer: String(coffee.producer ?? ""),
    country: String(coffee.country ?? ""),
    region: String(coffee.region ?? ""),
    farm: String(coffee.farm ?? ""),
    altitude: String(coffee.altitude ?? ""),
    remainingWeightG: coffee.remaining_weight_g == null ? "" : String(coffee.remaining_weight_g),
    receivedDate: String(coffee.received_date ?? ""),
  };
}

export function CoffeeEditor({ userId, coffee, brewAgainHref }: {
  userId: string;
  coffee: Record<string, unknown>;
  brewAgainHref: string;
}) {
  const t = useT();
  const id = String(coffee.id);
  const [form, setForm] = useState<CoffeeForm>(() => coffeeFormDefaults(coffee));
  const { state, retry } = useAutosave({
    key: draftKey(userId, "coffee-edit", id),
    value: form,
    sync: async (v) => {
      const res = await updateCoffee(id, v as Record<string, string>);
      if (res?.error) throw new Error(res.error);
    },
    serverUpdatedAt: typeof coffee.updated_at === "string" ? coffee.updated_at : null,
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div>
      <div className="mt-3 flex gap-2">
        <Link
          href={brewAgainHref}
          className="min-h-11 flex-1 rounded-[10px] bg-ember px-4 py-2.5 text-center font-medium text-white transition-transform active:scale-[0.98]"
        >
          {t("coffee.editor.brewAgain")}
        </Link>
      </div>
      <div className="mt-3 flex justify-end">
        <SaveStateBadge state={state} onRetry={retry} />
      </div>
      <Card className="mt-3">
        <div className="flex flex-col">
          <div><Label>{t("coffee.field.name")}</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
            <div><Label>{t("coffee.field.origin")}</Label><Input value={form.origin} onChange={(e) => set("origin", e.target.value)} /></div>
            <div><Label>{t("coffee.field.process")}</Label><Input value={form.process} onChange={(e) => set("process", e.target.value)} /></div>
            <div><Label>{t("coffee.field.variety")}</Label><Input value={form.variety} onChange={(e) => set("variety", e.target.value)} /></div>
            <div><Label>{t("coffee.field.producer")}</Label><Input value={form.producer} onChange={(e) => set("producer", e.target.value)} /></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
            <div><Label>{t("coffee.field.country")}</Label><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></div>
            <div><Label>{t("coffee.field.region")}</Label><Input value={form.region} onChange={(e) => set("region", e.target.value)} /></div>
            <div><Label>{t("coffee.field.farm")}</Label><Input value={form.farm} onChange={(e) => set("farm", e.target.value)} /></div>
            <div><Label>{t("coffee.field.altitude")}</Label><Input value={form.altitude} onChange={(e) => set("altitude", e.target.value)} /></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
            <div><Label>{t("coffee.field.remaining")}</Label><Input value={form.remainingWeightG} type="number" step="any" inputMode="decimal" className="tnum" onChange={(e) => set("remainingWeightG", e.target.value)} /></div>
            <div className="min-w-0"><Label>{t("coffee.field.received")}</Label><Input value={form.receivedDate} type="date" max={defaultBrewedDate()} onChange={(e) => set("receivedDate", e.target.value)} /></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
