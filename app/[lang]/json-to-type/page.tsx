import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import JsonToTypeTool from "./JsonToTypeTool";

export async function generateMetadata({ params }: PageProps<"/[lang]/json-to-type">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "jsonToType");
}

export default function Page() {
  return <JsonToTypeTool />;
}
