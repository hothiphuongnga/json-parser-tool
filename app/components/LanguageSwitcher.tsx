"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import { LOCALE_LABELS, LOCALES, localePath, stripLocale, type Locale } from "@/lib/i18n";

/** BCP 47 tags used to name each language in the current UI language ("zh-Hans" → "Simplified Chinese"). */
const DISPLAY_TAGS: Record<Locale, string> = { en: "en", vi: "vi", zh: "zh-Hans", ja: "ja", ko: "ko" };

/**
 * Language menu. The button always shows a 2-letter code so its width never changes; the list
 * shows each language in its own script plus its name in the current UI language.
 */
export default function LanguageSwitcher() {
  const { locale, t, intl } = useI18n();
  const path = stripLocale(usePathname());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const translatedNames = useMemo(() => {
    try {
      const names = new Intl.DisplayNames([intl], { type: "language" });
      return Object.fromEntries(LOCALES.map((option) => [option, names.of(DISPLAY_TAGS[option]) ?? ""])) as Record<Locale, string>;
    } catch {
      return null;
    }
  }, [intl]);

  useEffect(() => {
    if (!open) return;
    // Focus the current language so arrow keys start from it.
    listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();

    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>(".lang-menu-item") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "Tab") setOpen(false);
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <div className="lang-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={`${t.header.language}: ${LOCALE_LABELS[locale].name}`}
        className="lang-menu-button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={buttonRef}
        title={t.header.language}
        type="button"
      >
        <svg aria-hidden="true" className="lang-menu-globe" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
        </svg>
        <span className="lang-menu-code">{LOCALE_LABELS[locale].short}</span>
        <svg aria-hidden="true" className="lang-menu-chevron" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>

      {open ? (
        <div className="lang-menu-panel" id={menuId} onKeyDown={moveFocus} ref={listRef}>
          <p className="lang-menu-title">{t.header.language}</p>
          <nav aria-label={t.header.language} className="lang-menu-list">
            {LOCALES.map((option) => {
              const current = option === locale;
              const translated = translatedNames?.[option];
              const showTranslated = translated && translated.toLowerCase() !== LOCALE_LABELS[option].name.toLowerCase();
              return (
                <Link
                  aria-current={current ? "true" : undefined}
                  className="lang-menu-item"
                  href={localePath(option, path)}
                  hrefLang={option}
                  key={option}
                  // Keep the URL hash (e.g. shared JSON in #data=) when switching language.
                  onClick={(event) => {
                    setOpen(false);
                    if (!window.location.hash) return;
                    event.preventDefault();
                    window.location.assign(localePath(option, path) + window.location.hash);
                  }}
                >
                  <span aria-hidden="true" className="lang-menu-badge">
                    {LOCALE_LABELS[option].short}
                  </span>
                  <span className="lang-menu-names">
                    <span className="lang-menu-native" lang={option}>
                      {LOCALE_LABELS[option].name}
                    </span>
                    {showTranslated ? <span className="lang-menu-translated">{translated}</span> : null}
                  </span>
                  {current ? (
                    <svg aria-hidden="true" className="lang-menu-check" viewBox="0 0 24 24">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
