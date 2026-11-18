"use client";

import { createContext, useContext, useMemo } from "react";
import { getDictionary, LOCALE_LABELS, localePath, type Dictionary, type Locale } from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  /** The active dictionary. */
  t: Dictionary;
  /** BCP 47 tag for Intl / toLocaleString ("en-US", "vi-VN"). */
  intl: string;
  /** Formats a number with the locale's digit grouping. */
  n: (value: number) => string;
  /** Public path of a locale-less href in the current locale. */
  href: (path: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const intl = LOCALE_LABELS[locale].intl;
    const formatter = new Intl.NumberFormat(intl);
    return {
      locale,
      t: getDictionary(locale),
      intl,
      n: (number) => formatter.format(number),
      href: (path) => localePath(locale, path),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
