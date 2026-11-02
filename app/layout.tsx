import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "AtlasTrace — Bilingual Agentic RAG";
const description =
  "Evidence-first agentic RAG over XQuAD in English and Vietnamese: a Python LangGraph pipeline with planning, hybrid retrieval, a corrective critique loop and audited citations.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title,
    description: "Watch a team of agents turn an English or Vietnamese question into a cited answer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: "Watch a team of agents turn an English or Vietnamese question into a cited answer.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}

