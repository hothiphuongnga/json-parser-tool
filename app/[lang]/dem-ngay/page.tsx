import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import DayCounterTool from "./DayCounterTool";

export async function generateMetadata({ params }: PageProps<"/[lang]/dem-ngay">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "dayCounter");
}

export default function Page() {
  return <DayCounterTool />;
}
