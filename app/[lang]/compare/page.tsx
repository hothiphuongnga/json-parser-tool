import type { Metadata } from "next";
import { resolveLocale, toolMetadata } from "@/lib/i18n/metadata";
import CompareTool from "./CompareTool";

export async function generateMetadata({ params }: PageProps<"/[lang]/compare">): Promise<Metadata> {
  return toolMetadata(await resolveLocale(params), "compare");
}

export default function Page() {
  return <CompareTool />;
}
