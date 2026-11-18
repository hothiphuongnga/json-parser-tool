// Locale config shared by the proxy, server components and client components.

export const LOCALES = ["en", "vi", "zh", "ja", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

/** English is the default and is served without a prefix: /compare (en), /vi/compare (vi). */
export const DEFAULT_LOCALE: Locale = "en";

/** short: 2-letter code shown on the language button; name: the language in its own script. */
export const LOCALE_LABELS: Record<Locale, { short: string; name: string; intl: string; og: string }> = {
  en: { short: "EN", name: "English", intl: "en-US", og: "en_US" },
  vi: { short: "VI", name: "Tiếng Việt", intl: "vi-VN", og: "vi_VN" },
  zh: { short: "ZH", name: "简体中文", intl: "zh-CN", og: "zh_CN" },
  ja: { short: "JA", name: "日本語", intl: "ja-JP", og: "ja_JP" },
  ko: { short: "KO", name: "한국어", intl: "ko-KR", og: "ko_KR" },
};

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Public URL path of a page (`href` is the locale-less path, e.g. "/compare") in a locale. */
export function localePath(locale: Locale, href: string) {
  if (locale === DEFAULT_LOCALE) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** Removes a locale prefix from a public path: "/vi/compare" -> "/compare", "/vi" -> "/". */
export function stripLocale(pathname: string) {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}
