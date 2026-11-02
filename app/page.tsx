import { ResearchStudio } from "@/components/research-studio";
import type { Locale } from "@/lib/i18n/locale";
import initialResults from "@/lib/initial-results.json";
import type { ResearchResult } from "@/lib/types";

export default function Home() {
  // Pre-computed by scripts/build_initial_results.py so the first paint never
  // waits on the Python API, and switching language is instant.
  return <ResearchStudio initialResults={initialResults as Record<Locale, ResearchResult>} />;
}
