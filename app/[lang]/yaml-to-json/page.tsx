import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import JsonYamlTool from "../json-to-yaml/JsonYamlTool";

export async function generateMetadata({ params }: PageProps<"/[lang]/yaml-to-json">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "yamlToJson");
}

export default function Page() {
  return <JsonYamlTool initialDirection="toJson" />;
}
