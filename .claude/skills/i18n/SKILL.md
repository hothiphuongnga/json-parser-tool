---
name: i18n
description: Add, change or audit UI text across all GoingTool locales (en, vi, zh, ja, ko), or add a new locale. Use whenever user-visible text changes.
argument-hint: "[what to add/change, or a new locale code]"
---

# Translations

Request: `$ARGUMENTS`

## How it fits together

- `lib/i18n/config.ts` — `LOCALES`, `DEFAULT_LOCALE` (`en`, served without a URL prefix), `LOCALE_LABELS`, `localePath()`.
- `lib/i18n/en.ts` — source of truth; defines the `Dictionary` type. Strings with parameters are functions, e.g. `chars: (count: string) => \`${count} chars\``.
- `lib/i18n/{vi,zh,ja,ko}.ts` — typed as `Dictionary`, so a missing or misspelt key fails `tsc`.
- Client components: `const { t, n, intl, href, locale } = useI18n()`.
- Server metadata: `toolMetadata()` / `getDictionary()` in `lib/i18n/metadata.ts`.

## Changing text

1. Edit `en.ts` first, then the same key in every other dictionary — never leave English text in another locale's file.
2. Keep word order natural per language; if a sentence combines values, make it a function so each language can reorder (see `lunar.monthTitle`: "November 2026" vs "2026年11月").
3. Numbers through `n()`, dates through `Intl` with `intl` — never hard-code `"vi-VN"` or another locale.
4. `npx tsc --noEmit` must pass.

## Adding a locale

1. Add the code to `LOCALES` and `LOCALE_LABELS` in `lib/i18n/config.ts` **and** to `LOCALES` in `proxy.ts` (the proxy is self-contained on purpose).
2. Create `lib/i18n/<code>.ts` typed as `Dictionary`; register it in `lib/i18n/index.ts`.
3. Add the react-day-picker locale to `PICKER_LOCALES` in `DayCounterTool.tsx` and `LunarCalendarTool.tsx`.
4. Add a display tag in `DISPLAY_TAGS` (`app/components/LanguageSwitcher.tsx`).
5. Build; the new locale's pages and sitemap entries appear automatically.

## Audit

Use the `i18n-reviewer` agent to find hard-coded strings and suspicious translations.
