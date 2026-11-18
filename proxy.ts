import { NextResponse, type NextRequest } from "next/server";

// Kept self-contained (Proxy should not depend on shared app modules).
// Must match LOCALES / DEFAULT_LOCALE in lib/i18n/config.ts.
const LOCALES = ["en", "vi", "zh", "ja", "ko"];
const DEFAULT_LOCALE = "en";

/**
 * Locale routing:
 * - /vi/...  -> served as is (Vietnamese)
 * - /en/...  -> 308 to the unprefixed URL, so English has exactly one canonical address
 * - anything else -> rewritten to /en/... (English is the default and keeps clean URLs)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first] = pathname.split("/");

  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  // The resolved locale travels in a request header so app/global-not-found.tsx (which gets
  // no route params) can render the 404 page in the right language.
  const locale = LOCALES.includes(first) ? first : DEFAULT_LOCALE;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  if (locale === first) return NextResponse.next({ request: { headers: requestHeaders } });

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // Skip Next internals and any path with a file extension (icon.png, robots.txt, sitemap.xml, ads.txt…).
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)"],
};
