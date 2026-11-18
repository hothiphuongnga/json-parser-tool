<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GoingTool — project conventions

Free online developer tools (JSON parser, JSON to type, HTML online, text compare, Vietnamese lunar calendar, day counter) in 5 languages. Next.js 16 App Router, React 19, TypeScript, plain CSS with design tokens.

## Commands

- `npm run dev` — only **one** dev server may run per project directory. If one is already running (usually :3000), use it; never kill the user's server.
- `npx eslint .` · `npx tsc --noEmit` · `npx vitest run` · `npm run build` — all must pass before work is done (see the `verify` skill).

## Structure

- `app/[lang]/` — root layout and every page, prerendered per locale. `page.tsx` = server component with `generateMetadata`; `<Name>Tool.tsx` = client UI.
- `app/components/` — shared UI (`SiteHeader`, `ToolNav`, `CodeEditor`, `JsonError`, toggles, `I18nProvider`).
- `app/global-not-found.tsx` — 404 for unmatched URLs (needs `experimental.globalNotFound`).
- `proxy.ts` — locale routing: unprefixed → rewrite to `/en/...`; `/en/...` → 308 to unprefixed; sets `x-locale`. Self-contained on purpose.
- `lib/` — pure logic with vitest tests (`json`, `converters`, `diff`), browser helpers (`storage`, `hooks`, `theme`, `layout`), `i18n/`, `site.ts` (tool list → nav + sitemap).

## Rules

- **No hard-coded UI text.** Every user-visible string (including `aria-label`, `title`, `placeholder`) comes from `useI18n()` and exists in all dictionaries in `lib/i18n/`. English (`en.ts`) defines the shape. See the `i18n` skill.
- **No hard-coded locale tags or colours.** Format with `n()` / `intl`; style with the CSS variables in `app/globals.css` so light and dark both work.
- **Storage and clipboard** only through `lib/storage.ts` (they can throw).
- **Hydration:** anything depending on `localStorage`, the time zone or "today" renders after mount (`useIsClient`, `useSyncExternalStore`, or a `queueMicrotask` load in an effect). Theme/layout are applied by the inline script in `app/[lang]/layout.tsx` before paint.
- Do not render `<script>` from client components and do not hand-write `<head>`: AdSense injects into `<head>` and breaks hydration.
- New tool pages: follow the `add-tool` skill.
