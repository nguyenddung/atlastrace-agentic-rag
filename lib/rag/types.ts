import type { Locale } from "@/lib/i18n/locale";

export type AgentName = "Orchestrator" | "Query Planner" | "Hybrid Retriever" | "Evidence Critic" | "Answer Synthesizer";

export type AgentTrace = {
  agent: AgentName;
  detail: string;
  durationMs: number;
  status: "complete" | "revised";
};

export type Citation = {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  score: number;
  stance: "support" | "context" | "risk";
};

export type ResearchResult = {
  question: string;
  locale: Locale;
  mode: "demo" | "live" | "fallback";
  /** One-line headline rendered above the answer body, decided server-side. */
  verdict: string;
  answer: string;
  confidence: number;
  queries: string[];
  citations: Citation[];
  trace: AgentTrace[];
  metrics: {
    documentsScanned: number;
    passagesRetrieved: number;
    critiqueRounds: number;
    totalDurationMs: number;
  };
  fallbackReason?: string;
};
