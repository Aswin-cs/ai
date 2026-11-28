import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Roboto_Flex } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-roboto-flex",
});

export const metadata: Metadata = {
  title: "VayuPulse - AI Urban Air Quality Assistant",
  description:
    "Breathe smarter through winter smog with personalised daily air guidance powered by Gemini & live CPCB/OpenAQ telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${robotoFlex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-primary-container focus:text-on-primary focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
