import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HTML Online Viewer",
  description: "Write, format and preview HTML directly in your browser.",
};

export default function HtmlOnlineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
