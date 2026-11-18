import type { Locale } from "./config";
import en, { type Dictionary } from "./en";
import ja from "./ja";
import ko from "./ko";
import vi from "./vi";
import zh from "./zh";

export * from "./config";
export type { Dictionary };

// The dictionaries are small (a few KB each), so they are imported statically; this module is
// safe to use from server components (metadata) and client components (via I18nProvider) alike.
const DICTIONARIES: Record<Locale, Dictionary> = { en, vi, zh, ja, ko };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
