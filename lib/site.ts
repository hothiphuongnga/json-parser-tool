import type { Dictionary } from "./i18n";

export const SITE_NAME = "GoingTool";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://goingtool.com").replace(/\/$/, "");

export type ToolKey = keyof Dictionary["tools"];
export type PageKey = keyof Dictionary["meta"];

/** Nav entries, in order. `aliases` are other pages of the same tool (the entry stays highlighted there). */
export type ToolLink = { href: string; key: ToolKey; aliases?: string[] };

export const TOOLS: ToolLink[] = [
  { href: "/", key: "jsonParser" },
  { href: "/json-to-type", key: "jsonToType" },
  { href: "/json-to-yaml", key: "jsonYaml", aliases: ["/yaml-to-json"] },
  { href: "/html-online", key: "htmlOnline" },
  { href: "/compare", key: "compare" },
  { href: "/lunar-calendar", key: "lunarCalendar" },
  { href: "/dem-ngay", key: "dayCounter" },
];

/** Every indexable page with its metadata key (`t.meta[key]`); drives metadata and the sitemap. */
export const PAGES: Array<{ href: string; key: PageKey }> = [
  { href: "/", key: "jsonParser" },
  { href: "/json-to-type", key: "jsonToType" },
  { href: "/json-to-yaml", key: "jsonToYaml" },
  { href: "/yaml-to-json", key: "yamlToJson" },
  { href: "/html-online", key: "htmlOnline" },
  { href: "/compare", key: "compare" },
  { href: "/lunar-calendar", key: "lunarCalendar" },
  { href: "/dem-ngay", key: "dayCounter" },
];
