import type { MetadataRoute } from "next";
import { LOCALES, localePath } from "@/lib/i18n";
import { languageAlternates } from "@/lib/i18n/metadata";
import { SITE_URL, TOOLS } from "@/lib/site";

const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

/** One entry per tool per locale, each listing its translations as hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return TOOLS.flatMap((tool) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(tool.href)).map(([lang, path]) => [lang, absolute(path)]),
    );
    return LOCALES.map((locale) => ({
      url: absolute(localePath(locale, tool.href)),
      changeFrequency: "monthly" as const,
      priority: tool.href === "/" ? 1 : 0.8,
      alternates: { languages },
    }));
  });
}
