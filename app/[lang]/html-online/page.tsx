import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import HtmlOnlineTool from "./HtmlOnlineTool";

export async function generateMetadata({ params }: PageProps<"/[lang]/html-online">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "htmlOnline");
}

export default function Page() {
  return <HtmlOnlineTool />;
}
