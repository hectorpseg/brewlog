import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";
import { translate, type Translator } from "./translate";

// Resolved per request: cookie (explicit choice) > Accept-Language > English.
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
}

// Server Component usage: `const t = await getT(); t("nav.brews")`.
export async function getT(): Promise<Translator> {
  const locale = await getLocale();
  return (key) => translate(locale, key);
}
