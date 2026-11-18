import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGES, SITE_NAME, type PageKey } from "../site";
import { DEFAULT_LOCALE, getDictionary, hasLocale, LOCALE_LABELS, LOCALES, localePath, type Locale } from "./index";

/** Validates the [lang] segment; unknown locales are a 404. */
export async function resolveLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return lang;
}

/** hreflang alternates for a locale-less path, plus x-default pointing at English. */
export function languageAlternates(href: string) {
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((locale) => [locale, localePath(locale, href)]));
  languages["x-default"] = localePath(DEFAULT_LOCALE, href);
  return languages;
}

/** Title, description, canonical URL and hreflang links for one tool page in one locale. */
export function toolMetadata(locale: Locale, key: PageKey): Metadata {
  const t = getDictionary(locale);
  const href = PAGES.find((page) => page.key === key)?.href ?? "/";
  const { title, description } = t.meta[key];
  const isHome = href === "/";

  return {
    // The home page lives in the same segment as the layout, so the layout's title
    // template does not apply to it; it carries the site name itself.
    title: isHome ? { absolute: `${title} | ${SITE_NAME}` } : title,
    description,
    alternates: { canonical: localePath(locale, href), languages: languageAlternates(href) },
    openGraph: { title, description, url: localePath(locale, href), locale: LOCALE_LABELS[locale].og },
  };
}
