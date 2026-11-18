import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import JsonParserTool from "./JsonParserTool";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "jsonParser");
}

export default function Page() {
  return <JsonParserTool />;
}
