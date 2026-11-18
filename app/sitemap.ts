import type { MetadataRoute } from "next";
import { LOCALES, localePath } from "@/lib/i18n";
import { languageAlternates } from "@/lib/i18n/metadata";
import { PAGES, SITE_URL } from "@/lib/site";

const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

/** One entry per page per locale, each listing its translations as hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(page.href)).map(([lang, path]) => [lang, absolute(path)]),
    );
    return LOCALES.map((locale) => ({
      url: absolute(localePath(locale, page.href)),
      changeFrequency: "monthly" as const,
      priority: page.href === "/" ? 1 : 0.8,
      alternates: { languages },
    }));
  });
}
