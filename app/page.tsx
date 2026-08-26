import { ResearchStudio } from "@/components/research-studio";
import { getDictionary } from "@/lib/i18n/dictionary";
import { locales, type Locale } from "@/lib/i18n/locale";
import { runDeterministicResearch } from "@/lib/rag/deterministic";
import type { ResearchResult } from "@/lib/rag/types";

export default function Home() {
  // Both locales are rendered on the server, so switching language is instant
  // and the first paint never waits on a round-trip.
  const initialResults = Object.fromEntries(
    locales.map((locale) => [locale, runDeterministicResearch(getDictionary(locale).sampleQuestions[0], locale)]),
  ) as Record<Locale, ResearchResult>;

  return <ResearchStudio initialResults={initialResults} />;
}
