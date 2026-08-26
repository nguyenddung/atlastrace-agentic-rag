import { Output, ToolLoopAgent } from "ai";
import { z } from "zod";
import { corpusVi } from "@/lib/i18n/corpus-vi";
import { defaultLocale, type Locale } from "@/lib/i18n/locale";
import { knowledgeBase } from "@/lib/rag/corpus";
import { classifyQuestion, runDeterministicResearch } from "@/lib/rag/deterministic";
import { retrieveHybrid } from "@/lib/rag/retrieval";
import type { AgentTrace, Citation, ResearchResult } from "@/lib/rag/types";

// Routed through Vercel AI Gateway. Override with RESEARCH_MODEL_ID to swap
// providers without touching the agent contracts below.
const MODEL_ID = process.env.RESEARCH_MODEL_ID ?? "openai/gpt-5.6-sol";

const planSchema = z.object({
  intent: z.string(),
  queries: z.array(z.string()).min(2).max(4),
  successCriteria: z.array(z.string()).min(2).max(5),
});

const critiqueSchema = z.object({
  acceptedIds: z.array(z.string()).min(2).max(6),
  confidence: z.number().min(0).max(100),
  critique: z.string(),
  missingPerspective: z.string().nullable(),
});

const answerSchema = z.object({
  answer: z.string(),
  citedIds: z.array(z.string()).min(2).max(6),
  confidence: z.number().min(0).max(100),
});

const planner = new ToolLoopAgent({
  model: MODEL_ID,
  instructions: "You are a query-planning agent in an enterprise RAG system. Decompose decision questions into diverse, compact retrieval queries. Include benefits, risks, implementation evidence, and counter-evidence. Do not answer the question.",
  output: Output.object({ schema: planSchema }),
});

const critic = new ToolLoopAgent({
  model: MODEL_ID,
  instructions: "You are an evidence critic. Select only passages that directly support a grounded answer. Reward source diversity and explicit counter-evidence. Flag missing perspectives. Never invent document IDs.",
  output: Output.object({ schema: critiqueSchema }),
});

const synthesizer = new ToolLoopAgent({
  model: MODEL_ID,
  instructions:
    "You are a grounded answer synthesizer. Answer the question directly, distinguish evidence from recommendations, mention uncertainty, and cite every material claim with the exact format [DOC-ID]. Use only the supplied evidence. Write the answer in the language named by the ANSWER LANGUAGE field of the prompt, keeping document IDs verbatim.",
  output: Output.object({ schema: answerSchema }),
});

const liveVerdicts: Record<Locale, Record<ReturnType<typeof classifyQuestion>, string>> = {
  en: {
    controls: "Require five production gates before rollout.",
    segment: "Prioritize refrigerated fleets in Germany and the Netherlands.",
    maintenance: "Proceed with a gated, refrigeration-first rollout.",
    generic: "Use a controlled rollout with explicit evidence gates.",
  },
  vi: {
    controls: "Yêu cầu năm cổng kiểm soát trước khi đưa vào vận hành.",
    segment: "Ưu tiên đội xe đông lạnh tại Đức và Hà Lan.",
    maintenance: "Triển khai theo cổng duyệt, ưu tiên xe đông lạnh trước.",
    generic: "Triển khai có kiểm soát với các cổng bằng chứng rõ ràng.",
  },
};

function verdictFor(question: string, locale: Locale) {
  return (liveVerdicts[locale] ?? liveVerdicts.en)[classifyQuestion(question)];
}

function now() {
  return performance.now();
}

function elapsed(started: number) {
  return Math.max(1, Math.round(performance.now() - started));
}

function formatEvidence(items: ReturnType<typeof retrieveHybrid>) {
  return items.map((item) => `ID: ${item.id}\nTITLE: ${item.title}\nSOURCE: ${item.source}\nSTANCE: ${item.stance}\nTEXT: ${item.text}`).join("\n\n---\n\n");
}

export async function runLiveResearch(question: string, locale: Locale = defaultLocale): Promise<ResearchResult> {
  const pipelineStarted = now();
  const trace: AgentTrace[] = [];
  trace.push({ agent: "Orchestrator", detail: "Routed the decision query to a three-agent research team.", durationMs: 12, status: "complete" });

  const plannerStarted = now();
  const planResult = await planner.generate({ prompt: question });
  const plan = planResult.output;
  trace.push({ agent: "Query Planner", detail: `Created ${plan.queries.length} retrieval paths for: ${plan.intent}`, durationMs: elapsed(plannerStarted), status: "complete" });

  const retrievalStarted = now();
  const firstPass = retrieveHybrid(question, plan.queries, 6);
  trace.push({ agent: "Hybrid Retriever", detail: `Fused lexical and vector ranks across ${knowledgeBase.length} documents.`, durationMs: elapsed(retrievalStarted), status: "complete" });

  const criticStarted = now();
  const critiqueResult = await critic.generate({
    prompt: `QUESTION:\n${question}\n\nSUCCESS CRITERIA:\n${plan.successCriteria.join("\n")}\n\nCANDIDATE EVIDENCE:\n${formatEvidence(firstPass)}`,
  });
  const critique = critiqueResult.output;
  trace.push({ agent: "Evidence Critic", detail: critique.critique, durationMs: elapsed(criticStarted), status: critique.missingPerspective ? "revised" : "complete" });

  let evidence = firstPass;
  let critiqueRounds = 1;
  if (critique.missingPerspective) {
    const revisionStarted = now();
    evidence = retrieveHybrid(question, [...plan.queries, critique.missingPerspective], 7);
    critiqueRounds = 2;
    trace.push({ agent: "Hybrid Retriever", detail: `Ran a corrective retrieval for: ${critique.missingPerspective}`, durationMs: elapsed(revisionStarted), status: "revised" });
  }

  const accepted = evidence.filter((item) => critique.acceptedIds.includes(item.id));
  const groundedEvidence = accepted.length >= 2 ? accepted : evidence.slice(0, 5);
  const synthesizerStarted = now();
  const answerResult = await synthesizer.generate({
    prompt: `ANSWER LANGUAGE:\n${locale === "vi" ? "Vietnamese" : "English"}\n\nQUESTION:\n${question}\n\nEVIDENCE:\n${formatEvidence(groundedEvidence)}\n\nCRITIC NOTE:\n${critique.critique}`,
  });
  const synthesis = answerResult.output;
  trace.push({ agent: "Answer Synthesizer", detail: `Produced a grounded answer with ${synthesis.citedIds.length} citations.`, durationMs: elapsed(synthesizerStarted), status: "complete" });

  const cited = groundedEvidence.filter((item) => synthesis.citedIds.includes(item.id));
  const citationSource = cited.length >= 2 ? cited : groundedEvidence;
  const citations: Citation[] = citationSource.slice(0, 6).map((item) => {
    const translated = locale === "vi" ? corpusVi[item.id] : undefined;
    return {
      id: item.id,
      title: translated?.title ?? item.title,
      source: translated?.source ?? item.source,
      excerpt: translated?.text ?? item.text,
      score: Math.round(item.fused * 100),
      stance: item.stance,
    };
  });

  return {
    question,
    locale,
    mode: "live",
    verdict: verdictFor(question, locale),
    answer: synthesis.answer,
    confidence: Math.round((synthesis.confidence + critique.confidence) / 2),
    queries: plan.queries,
    citations,
    trace,
    metrics: {
      documentsScanned: knowledgeBase.length,
      passagesRetrieved: evidence.length,
      critiqueRounds,
      totalDurationMs: elapsed(pipelineStarted),
    },
  };
}

export async function runResearch(question: string, requestedMode: "demo" | "live", locale: Locale = defaultLocale) {
  if (requestedMode === "demo") return runDeterministicResearch(question, locale);

  try {
    return await runLiveResearch(question, locale);
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 180) : "AI Gateway was unavailable";
    return runDeterministicResearch(question, locale, reason);
  }
}

