import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import LunarCalendarTool from "./LunarCalendarTool";

export async function generateMetadata({ params }: PageProps<"/[lang]/lunar-calendar">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "lunarCalendar");
}

export default function Page() {
  return <LunarCalendarTool />;
}
