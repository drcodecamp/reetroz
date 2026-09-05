import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3210",
  ),
  title: "Pixel Press — Every issue of Computer Gaming World, 1981–2006",
  description:
    "Read all 268 issues of Computer Gaming World in a fast, beautiful online reader. Browse 25 years of PC gaming history by year, cover, or game.",
  openGraph: {
    title: "Pixel Press — 25 years of gaming magazines, one reader",
    description:
      "268 issues. 40,000+ pages. Every era of PC gaming, from 1981 to 2006, readable in your browser.",
    images: ["/img/hero-desk.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#06080f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="grain min-h-screen antialiased">{children}</body>
    </html>
  );
}
