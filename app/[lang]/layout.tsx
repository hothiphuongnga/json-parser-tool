import type { Metadata } from "next";
import { I18nProvider } from "@/app/components/I18nProvider";
import { getDictionary, LOCALE_LABELS, LOCALES } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n/metadata";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { LAYOUT_INIT_SCRIPT, THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "../globals.css";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-1061165377901019";

/** Every page is prerendered once per locale; any other [lang] value is a 404. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: { template: `%s | ${SITE_NAME}`, default: `${SITE_NAME} – ${t.site.tagline}` },
    description: t.site.description,
    applicationName: SITE_NAME,
    openGraph: { siteName: SITE_NAME, type: "website", locale: LOCALE_LABELS[locale].og },
    icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
    other: { "google-adsense-account": ADSENSE_CLIENT },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const locale = await resolveLocale(params);

  return (
    // data-theme / data-layout are set by the init script before hydration, so React must not compare them.
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/*
          Runs synchronously before any content is painted, so the saved theme/layout never
          flashes. It lives at the top of <body>, not in a hand-written <head>: AdSense injects
          its own <script> tags into <head>, which made React's hydration of <head> fail.
          (next/script "beforeInteractive" is not an option: in the App Router an inline script
          is queued and only runs after the page has painted.)
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + LAYOUT_INIT_SCRIPT }} />
        <I18nProvider locale={locale}>{children}</I18nProvider>
        {/*
          A plain async script (not next/script, whose data-nscript attribute AdSense rejects).
          React 19 hoists async scripts into <head> as a resource, outside positional hydration.
        */}
        <script
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        />
      </body>
    </html>
  );
}
