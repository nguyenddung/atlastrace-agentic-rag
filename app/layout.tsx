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

const title = "AtlasTrace — Multi-Agent RAG Studio";
const description =
  "An evidence-first Agentic RAG portfolio project with planning, hybrid retrieval, critique loops, and grounded synthesis.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title,
    description: "Watch four specialized agents turn a question into a cited answer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: "Watch four specialized agents turn a question into a cited answer.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}

