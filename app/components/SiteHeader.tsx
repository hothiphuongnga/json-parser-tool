"use client";

import Link from "next/link";
import { useI18n } from "./I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import LayoutToggle from "./LayoutToggle";
import ThemeToggle from "./ThemeToggle";
import ToolNav from "./ToolNav";
import { SITE_NAME, type ToolKey } from "@/lib/site";

type SiteHeaderProps = {
  tool: ToolKey;
  /** Editor-style pages get the focus / full-width switch for their workspace. */
  workspace?: boolean;
};

/** The one top bar used by every tool: brand, tool switcher, language and display switches. */
export default function SiteHeader({ tool, workspace = false }: SiteHeaderProps) {
  const { t, href } = useI18n();

  return (
    <header className="topbar">
      <Link className="brand" href={href("/")}>
        {SITE_NAME}
        <span className="brand-tool">{t.tools[tool].label}</span>
      </Link>
      <div className="toolbar">
        <ToolNav className="tool-nav" linkClassName="btn btn-muted tool-link" />
        <div className="header-toggles">
          <LanguageSwitcher />
          {workspace ? <LayoutToggle /> : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
