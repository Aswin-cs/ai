import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VayuMitra - AI Urban Air Quality Assistant",
  description:
    "Breathe smarter through winter smog with personalised daily air guidance powered by Gemini & live CPCB/OpenAQ telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Roboto+Flex:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
