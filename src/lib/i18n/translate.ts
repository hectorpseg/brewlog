import { DEFAULT_LOCALE, type Locale } from "./config";
import { DICTIONARIES, type TranslationKey } from "./dictionaries";

export type Translator = (key: TranslationKey) => string;

// Missing key -> English -> the key itself: a label is never blank.
export function translate(locale: Locale, key: TranslationKey): string {
  return DICTIONARIES[locale]?.[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
}

export function createTranslator(locale: Locale): Translator {
  return (key) => translate(locale, key);
}
