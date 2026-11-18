"use client";

import { useI18n } from "./I18nProvider";
import { useTheme } from "@/lib/theme";

/** Light/dark switch: a pill track with sun and moon, and a knob that slides between them. */
export default function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const { t } = useI18n();
  const dark = theme === "dark";

  return (
    <button
      aria-checked={dark}
      aria-label={t.header.darkMode}
      className="theme-toggle"
      onClick={() => setTheme(dark ? "light" : "dark")}
      role="switch"
      title={dark ? t.header.toLight : t.header.toDark}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle-icon theme-toggle-sun">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </span>
      <span aria-hidden="true" className="theme-toggle-icon theme-toggle-moon">
        <svg viewBox="0 0 24 24">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
        </svg>
      </span>
      <span aria-hidden="true" className="theme-toggle-knob" />
    </button>
  );
}
