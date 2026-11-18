---
name: add-tool
description: Add a new tool page to GoingTool (route under app/[lang], nav entry, translations in all locales, metadata, sitemap). Use when the user asks for a new tool or a new page.
argument-hint: "<slug> <short description>"
---

# Add a new tool page

Arguments: `$ARGUMENTS` (slug such as `json-to-yaml`, then what the tool does).

Read `AGENTS.md` first, and the relevant guide in `node_modules/next/dist/docs/` for any Next.js API you touch.

## Steps

1. **Pure logic first.** Put parsing/conversion code in `lib/<name>.ts` with no React imports, and add `lib/<name>.test.ts` (vitest). Keep it locale-independent: take user-facing messages as parameters.

2. **Route.** Create `app/[lang]/<slug>/`:
   - `page.tsx` — server component, copy the shape of `app/[lang]/compare/page.tsx`:
     `generateMetadata` → `toolMetadata(await resolveLocale(params), "<toolKey>")`, default export renders the client tool.
   - `<Name>Tool.tsx` — `"use client"`, gets strings from `useI18n()`.
   - `<slug>.css` if needed — only design tokens from `app/globals.css` (`--surface`, `--border`, `--brand`, `--text-soft`, …). No hard-coded colours; it must work in light and dark.

3. **Layout.** Pick the matching shell:
   - Editor-style (two panels): `<main className="parser-shell">` + `.workspace`, `CodeEditor`, `useSplitResize`, status bar — see `app/[lang]/json-to-type/JsonToTypeTool.tsx`.
   - Scrolling page: `<main className="page-shell">` + `.page-content` + `.card` — see `app/[lang]/compare/CompareTool.tsx`.
   - Always `<SiteHeader tool="<toolKey>" workspace />` and `<GoogleAd />`.

4. **Nav + sitemap.** Add `{ href: "/<slug>", key: "<toolKey>" }` to `TOOLS` in `lib/site.ts`. Nav, sitemap and hreflang pick it up automatically.

5. **Translations — every locale.** In `lib/i18n/en.ts` add `tools.<toolKey>`, `meta.<toolKey>` and a `<toolKey>` section for UI strings. Then add the same keys to `vi.ts`, `zh.ts`, `ja.ts`, `ko.ts` (the build fails if one is missing). No user-visible string may stay hard-coded in the component, including `aria-label`, `title` and `placeholder`.

6. **Dates/numbers.** Format with `n()` / `intl` from `useI18n()`, never a hard-coded `"vi-VN"`. Anything that depends on "today" must render after hydration (`useIsClient`), like the day counter.

7. **Docs.** Add the tool to the table in `README.md`.

8. **Verify** with the `verify` skill.
