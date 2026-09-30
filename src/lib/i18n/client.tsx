"use client";
import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { createTranslator, type Translator } from "./translate";

// The server resolves the locale and passes it down, so the first client render
// always matches the server HTML — no hydration mismatch. Client Components
// read it through this context instead of detecting anything themselves.
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translator {
  return createTranslator(useLocale());
}
