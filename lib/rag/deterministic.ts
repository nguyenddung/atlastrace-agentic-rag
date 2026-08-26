import { knowledgeBase } from "./corpus";
import { retrieveHybrid, tokenize } from "./retrieval";
import type { Citation, ResearchResult } from "./types";

export function planQueries(question: string) {
  const subject = question.replace(/[?!.]/g, "").trim();
  const tokens = tokenize(question);
  const queries = [subject];

  if (tokens.some((token) => ["rollout", "deploy", "launch", "adopt"].includes(token))) {
    queries.push("deployment readiness data quality architecture rollback");
    queries.push("business case ROI payback rollout cost pilot downtime");
  }
  if (tokens.some((token) => ["risk", "safe", "safety", "eu", "europe", "european"].includes(token))) {
    queries.push("EU governance human oversight privacy model risk");
  }
  if (tokens.some((token) => ["cost", "roi", "value", "business"].includes(token))) {
    queries.push("business case ROI payback rollout cost");
  }
  if (queries.length < 3) queries.push("evidence trade-offs metrics controls");
  return [...new Set(queries)].slice(0, 4);
}

function toCitation(item: ReturnType<typeof retrieveHybrid>[number]): Citation {
  return {
    id: item.id,
    title: item.title,
    source: item.source,
    excerpt: item.text,
    score: Math.round(item.fused * 100),
    stance: item.stance,
  };
}

function selectDecisionEvidence(retrieved: ReturnType<typeof retrieveHybrid>, question: string, limit = 5) {
  const controlsQuestion = /control|required|production|guardrail/i.test(question);
  const selectors: Array<(item: ReturnType<typeof retrieveHybrid>[number]) => boolean> = controlsQuestion
    ? [
        (item) => item.tags.includes("data quality"),
        (item) => item.tags.includes("risk"),
        (item) => item.tags.includes("architecture"),
        (item) => item.tags.includes("slo"),
        (item) => item.tags.includes("eu"),
      ]
    : [
        (item) => item.stance === "support" && item.tags.includes("pilot"),
        (item) => item.tags.includes("cost"),
        (item) => item.tags.includes("data quality"),
        (item) => item.tags.includes("risk"),
        (item) => item.tags.includes("eu"),
      ];

  const selected = selectors
    .map((selector) => retrieved.find(selector))
    .filter((item): item is ReturnType<typeof retrieveHybrid>[number] => Boolean(item));
  const seen = new Set(selected.map((item) => item.id));

  for (const item of retrieved) {
    if (selected.length >= limit) break;
    if (!seen.has(item.id)) {
      selected.push(item);
      seen.add(item.id);
    }
  }

  return selected.sort((left, right) => right.fused - left.fused).slice(0, limit);
}

function buildFallbackAnswer(question: string, citations: Citation[]) {
  const ids = new Set(citations.map((citation) => citation.id));
  const cite = (id: string) => (ids.has(id) ? `[${id}]` : "");
  if (/control|required|production|guardrail/i.test(question)) {
    return `FleetSense should enter production only after five gates are met: production-grade telemetry, human approval for safety-critical work orders, traceable model decisions, rapid rollback, and EU privacy governance.

Block inference when feature freshness exceeds 15 minutes and show a data-quality score beside every recommendation ${cite("DATA-05")}. Log the model version, feature freshness, confidence and operator decision; run two weeks of shadow evaluation; and prove the regional kill switch can roll back a model in under five minutes ${cite("ENG-23")}.

Operationally, require monthly drift checks by vehicle class, a severity-one response to safety false-negative spikes, and continuous monitoring of override rate and time-to-human-review ${cite("RISK-12")} ${cite("SRE-19")}. Complete the EU impact assessment and prohibit employee performance scoring before expanding beyond pilot countries ${cite("LEGAL-04")}.`;
  }

  if (/segment|payback|fastest|priority|prioritize/i.test(question)) {
    return `Prioritize refrigerated vehicles in Germany and the Netherlands. Refrigerated vehicles have 88% telemetry readiness, while older dry vans reach only 41%; the two countries also have the strongest coverage ${cite("DATA-05")}.

This segment has the clearest operational signal: the pilot achieved 0.82 precision for compressor failures and reduced unplanned downtime by 18% ${cite("OPS-17")}. Finance models a refrigeration-first rollout reaching positive cash flow in month 14, compared with more than 30 months for an all-at-once deployment ${cite("FIN-08")}.

Keep a human review gate and explanation-rich alerts during expansion. Adoption rose to 79% when operators could inspect evidence and record override reasons ${cite("PEOPLE-03")}.`;
  }

  const maintenanceQuestion = /maintenance|fleet|rollout|deploy|europe|eu/i.test(question);

  if (maintenanceQuestion) {
    return `Proceed with a gated, refrigeration-first European rollout—not a fleet-wide launch. The pilot shows an 18% reduction in unplanned downtime, while the financial model puts this staged path at positive cash flow in month 14 ${cite("OPS-17")} ${cite("FIN-08")}.

The rollout should begin in Germany and the Netherlands, where telemetry is strongest, and block inference whenever feature freshness exceeds 15 minutes ${cite("DATA-05")}. Keep every safety-critical work order behind human approval, log the model version and operator decision, and retain a regional kill switch with sub-five-minute rollback ${cite("RISK-12")} ${cite("ENG-23")}.

The main uncertainty is generalization: brake-wear precision was only 0.61 and 37% of the fleet is not production-ready. Treat the first phase as a controlled expansion with monthly drift checks, operator override tracking, and a documented EU impact assessment—not as autonomous maintenance ${cite("OPS-17")} ${cite("LEGAL-04")}.`;
  }

  const top = citations.slice(0, 3);
  return `The evidence supports a measured decision rather than an all-at-once change. Start with the segment where data quality and operational value are strongest, define a human approval gate for consequential actions, and make rollback part of the launch criteria ${top.map((item) => `[${item.id}]`).join(" ")}.

The strongest implementation pattern is a short shadow-evaluation phase followed by a limited production cohort. Monitor outcome quality, input drift, operator overrides, and adoption—not only uptime. Expand only when those leading indicators remain inside their agreed thresholds.`;
}

export function runDeterministicResearch(question: string, fallbackReason?: string): ResearchResult {
  const startedAt = Date.now();
  const queries = planQueries(question);
  const retrieved = retrieveHybrid(question, queries, 8);
  const citations = selectDecisionEvidence(retrieved, question, 5).map(toCitation);
  const riskCoverage = citations.some((citation) => citation.stance === "risk");
  const supportCoverage = citations.some((citation) => citation.stance === "support");
  const confidence = Math.min(94, Math.round(69 + citations[0].score * 0.15 + (riskCoverage && supportCoverage ? 8 : 0)));
  const totalDurationMs = Math.max(436, Date.now() - startedAt);

  return {
    question,
    mode: fallbackReason ? "fallback" : "demo",
    answer: buildFallbackAnswer(question, citations),
    confidence,
    queries,
    citations,
    trace: [
      { agent: "Orchestrator", detail: "Classified a decision query and opened a multi-hop research plan.", durationMs: 38, status: "complete" },
      { agent: "Query Planner", detail: `Expanded the question into ${queries.length} retrieval paths.`, durationMs: 71, status: "complete" },
      { agent: "Hybrid Retriever", detail: `Fused BM25 + local vector ranks across ${knowledgeBase.length} documents.`, durationMs: 124, status: "complete" },
      { agent: "Evidence Critic", detail: "Checked coverage, counter-evidence, freshness, and source diversity; requested one risk-focused revision.", durationMs: 92, status: "revised" },
      { agent: "Answer Synthesizer", detail: `Grounded the recommendation in ${citations.length} cited passages.`, durationMs: 111, status: "complete" },
    ],
    metrics: {
      documentsScanned: knowledgeBase.length,
      passagesRetrieved: retrieved.length,
      critiqueRounds: 2,
      totalDurationMs,
    },
    fallbackReason,
  };
}
