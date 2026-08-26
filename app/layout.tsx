import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
  "https://atlastrace-ten.vercel.app";

export const metadata: Metadata = {
  title: "AtlasTrace — Multi-Agent RAG Studio",
  description:
    "An evidence-first Agentic RAG portfolio project with planning, hybrid retrieval, critique loops, and grounded synthesis.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "AtlasTrace — Multi-Agent RAG Studio",
    description: "Watch four specialized agents turn a question into a cited answer.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}

