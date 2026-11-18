"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { stripLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/site";

type ToolNavProps = {
  /** Class for the <nav>; each page keeps its own visual style. */
  className?: string;
  /** Class applied to every link (e.g. "btn btn-muted tool-link"). */
  linkClassName?: string;
};

/** The same list of tools, in the same order, on every page, linking within the current language. */
export default function ToolNav({ className, linkClassName }: ToolNavProps) {
  const { t, href } = useI18n();
  const current = stripLocale(usePathname());

  return (
    <nav aria-label={t.header.toolsNav} className={className}>
      {TOOLS.map((tool) => (
        <Link
          aria-current={current === tool.href || tool.aliases?.includes(current) ? "page" : undefined}
          className={linkClassName}
          href={href(tool.href)}
          key={tool.href}
          title={t.tools[tool.key].description}
        >
          {t.tools[tool.key].label}
        </Link>
      ))}
    </nav>
  );
}
