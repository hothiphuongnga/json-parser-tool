import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import JsonYamlTool from "./JsonYamlTool";

export async function generateMetadata({ params }: PageProps<"/[lang]/json-to-yaml">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "jsonToYaml");
}

export default function Page() {
  return <JsonYamlTool initialDirection="toYaml" />;
}
