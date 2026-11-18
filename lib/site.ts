import type { Dictionary } from "./i18n";

export const SITE_NAME = "GoingTool";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://goingtool.com").replace(/\/$/, "");

export type ToolKey = keyof Dictionary["tools"];
export type ToolLink = { href: string; key: ToolKey };

/** Tools in nav order. Labels and descriptions come from the dictionary (`t.tools[key]`). */
export const TOOLS: ToolLink[] = [
  { href: "/", key: "jsonParser" },
  { href: "/json-to-type", key: "jsonToType" },
  { href: "/html-online", key: "htmlOnline" },
  { href: "/compare", key: "compare" },
  { href: "/lunar-calendar", key: "lunarCalendar" },
  { href: "/dem-ngay", key: "dayCounter" },
];
