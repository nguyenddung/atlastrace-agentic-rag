import type { Locale } from "@/lib/i18n/locale";

/** Mirrors atlastrace/schemas.py — the Python API is the source of truth for this shape. */

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
  /** "support": cited in the answer. "context": accepted by the critic but not cited. */
  stance: "support" | "context";
};

export type ResearchResult = {
  question: string;
  locale: Locale;
  mode: "demo" | "live" | "fallback";
  /** One-line headline rendered above the answer body. */
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
    /** % of the question's (IDF-weighted) terms found in the accepted evidence. */
    queryCoverage: number;
    /** Citations dropped because they pointed outside the evidence ledger. */
    citationsRemoved: number;
  };
  fallbackReason?: string;
};
