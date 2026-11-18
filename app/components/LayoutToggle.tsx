"use client";

import { useI18n } from "./I18nProvider";
import { useWorkspaceLayout } from "@/lib/layout";

/** Switch between a centred workspace (focus) and a full-width one. */
export default function LayoutToggle() {
  const [layout, setLayout] = useWorkspaceLayout();
  const { t } = useI18n();
  const wide = layout === "wide";

  return (
    <button
      aria-checked={wide}
      aria-label={t.header.wideWorkspace}
      className="pill-toggle layout-toggle"
      onClick={() => setLayout(wide ? "focus" : "wide")}
      role="switch"
      title={wide ? t.header.toFocus : t.header.toWide}
      type="button"
    >
      {/* Focus: a narrow column inside a frame */}
      <span aria-hidden="true" className="pill-toggle-icon">
        <svg viewBox="0 0 24 24">
          <rect height="16" rx="2" width="20" x="2" y="4" />
          <path d="M8 4v16M16 4v16" />
        </svg>
      </span>
      {/* Wide: arrows pushing out to both edges */}
      <span aria-hidden="true" className="pill-toggle-icon">
        <svg viewBox="0 0 24 24">
          <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
        </svg>
      </span>
      <span aria-hidden="true" className="pill-toggle-knob" />
    </button>
  );
}
