import type { Metadata } from "next";
import { headers } from "next/headers";
import { I18nProvider } from "@/app/components/I18nProvider";
import NotFoundView from "@/app/components/NotFoundView";
import { DEFAULT_LOCALE, hasLocale } from "@/lib/i18n";
import { LAYOUT_INIT_SCRIPT, THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 – GoingTool",
  robots: { index: false },
};

/**
 * Served for any URL that matches no route. It bypasses app/[lang]/layout.tsx, so it renders
 * its own document; the proxy passes the requested locale in the x-locale header.
 */
export default async function GlobalNotFound() {
  const requested = (await headers()).get("x-locale") ?? DEFAULT_LOCALE;
  const locale = hasLocale(requested) ? requested : DEFAULT_LOCALE;

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + LAYOUT_INIT_SCRIPT }} />
        <I18nProvider locale={locale}>
          <NotFoundView />
        </I18nProvider>
      </body>
    </html>
  );
}
