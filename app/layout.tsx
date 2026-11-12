import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSON Parser Online",
  description: "Format, validate, minify and inspect JSON data online",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta
          name="google-adsense-account"
          content="ca-pub-1061165377901019"
        />
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1061165377901019"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
