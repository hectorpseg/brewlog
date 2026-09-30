"use client";
import { useTransition } from "react";
import { Select } from "@/components/ui/controls";
import { setLocale } from "@/app/actions";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";

// Language selector: persists the choice through a server action, which sets
// the cookie and revalidates the root layout. The locale comes from context
// (server-resolved), so the selected value is correct on first render.
export function LocaleSelect() {
  const locale = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <Select
      aria-label={t("nav.language")}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        if (!isLocale(next) || next === locale) return;
        startTransition(async () => {
          await setLocale(next);
        });
      }}
    >
      {LOCALES.map((value) => (
        <option key={value} value={value}>
          {t(value === "es" ? "nav.spanish" : "nav.english")}
        </option>
      ))}
    </Select>
  );
}
