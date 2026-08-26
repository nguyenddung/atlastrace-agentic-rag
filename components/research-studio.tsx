"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Citation, ResearchResult } from "@/lib/rag/types";

const sampleQuestions = [
  "Should Northstar roll out predictive maintenance across its EU fleet?",
  "What controls are required before FleetSense can enter production?",
  "Which fleet segment offers the safest and fastest payback?",
];

const agentMeta = {
  Orchestrator: { code: "OR", color: "violet" },
  "Query Planner": { code: "QP", color: "blue" },
  "Hybrid Retriever": { code: "HR", color: "cyan" },
  "Evidence Critic": { code: "EC", color: "amber" },
  "Answer Synthesizer": { code: "AS", color: "green" },
} as const;

function CitationText({ text, citations }: { text: string; citations: Citation[] }) {
  const knownIds = new Set(citations.map((citation) => citation.id));
  return text.split(/(\[[A-Z]+-\d+\])/g).map((part, index) => {
    const id = part.slice(1, -1);
    if (!knownIds.has(id)) return part;
    return (
      <button
        className="inline-citation"
        key={`${part}-${index}`}
        onClick={() => document.getElementById(`evidence-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        aria-label={`View source ${id}`}
      >
        {id}
      </button>
    );
  });
}

function ConfidenceRing({ value }: { value: number }) {
  const style = { "--confidence": `${value * 3.6}deg` } as React.CSSProperties;
  return (
    <div className="confidence-ring" style={style} aria-label={`${value}% grounded confidence`}>
      <div>
        <strong>{value}%</strong>
        <span>grounded</span>
      </div>
    </div>
  );
}

function verdictFor(question: string) {
  if (/control|required|production|guardrail/i.test(question)) return "Require five production gates before rollout.";
  if (/segment|payback|fastest|priority|prioritize/i.test(question)) return "Prioritize refrigerated fleets in Germany and the Netherlands.";
  if (/maintenance|fleet|rollout|deploy/i.test(question)) return "Proceed with a gated, refrigeration-first rollout.";
  return "Use a controlled rollout with explicit evidence gates.";
}

export function ResearchStudio({ initialResult }: { initialResult: ResearchResult }) {
  const [question, setQuestion] = useState(initialResult.question);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState(initialResult.citations[0]?.id ?? "");

  const activeCitation = useMemo(
    () => result.citations.find((citation) => citation.id === selectedSource) ?? result.citations[0],
    [result.citations, selectedSource],
  );

  async function runResearch(event?: FormEvent) {
    event?.preventDefault();
    if (question.trim().length < 12 || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, mode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Research run failed");
      setResult(payload as ResearchResult);
      setSelectedSource((payload as ResearchResult).citations[0]?.id ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Research run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AtlasTrace home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>AtlasTrace</span>
          <small>Fleet intelligence</small>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#decision-room">Decision room</a>
          <a href="#architecture">Architecture</a>
          <a href="https://github.com/nguyenddung/RAG" target="_blank" rel="noreferrer">Source ↗</a>
        </nav>
        <div className="system-status"><i /> System ready</div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>01</span> THE PAIN POINT</div>
        <div className="hero-grid">
          <div>
            <h1>High-stakes fleet decisions are buried in <em>contradictory evidence.</em></h1>
            <p className="hero-copy">
              Operations leaders must reconcile pilot results, telemetry gaps, ROI, safety controls and EU worker privacy before a predictive-maintenance rollout. Single-pass RAG retrieves a plausible answer; it rarely checks what it missed.
            </p>
          </div>
          <aside className="pain-card">
            <div className="pain-card-top"><span>Decision brief / EU-2026-04</span><b>OPEN</b></div>
            <h2>Should Northstar expand FleetSense to 2,400 EU vehicles?</h2>
            <div className="conflict-row"><span>Operations</span><strong className="positive">18% less downtime</strong></div>
            <div className="conflict-row"><span>Finance</span><strong>€1.4M year-one cost</strong></div>
            <div className="conflict-row"><span>Data</span><strong className="warning">37% not ready</strong></div>
            <div className="conflict-row"><span>Risk</span><strong className="danger">Human gate required</strong></div>
            <p>8 siloed documents · 5 stakeholder views · 1 auditable decision</p>
          </aside>
        </div>
        <div className="solution-strip">
          <span>AtlasTrace turns the evidence trail into a decision trail.</span>
          <div><b>Plan</b><i>→</i><b>Retrieve</b><i>→</i><b>Critique</b><i>↻</i><b>Synthesize</b></div>
        </div>
      </section>

      <section className="workspace-section" id="decision-room">
        <div className="section-heading">
          <div><span className="section-number">02</span><p>LIVE DECISION ROOM</p></div>
          <h2>Inspect the reasoning, not just the answer.</h2>
          <p>Every recommendation exposes retrieval paths, agent handoffs, rejected assumptions and source-level grounding.</p>
        </div>

        <form className="query-console" onSubmit={runResearch}>
          <div className="query-label"><span>DECISION QUERY</span><small>{question.length}/500</small></div>
          <div className="query-input-row">
            <span className="prompt-glyph">⌁</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void runResearch();
                }
              }}
              maxLength={500}
              rows={2}
              aria-label="Decision question"
            />
            <button type="submit" disabled={loading || question.trim().length < 12}>
              {loading ? <><span className="spinner" /> Running agents</> : <>Run research <span>⌘↵</span></>}
            </button>
          </div>
          <div className="console-footer">
            <div className="samples">
              {sampleQuestions.map((sample, index) => (
                <button type="button" key={sample} onClick={() => setQuestion(sample)}>{String(index + 1).padStart(2, "0")} {sample.split("?")[0]}</button>
              ))}
            </div>
            <div className="mode-switch" role="group" aria-label="Research mode">
              <button type="button" className={mode === "demo" ? "active" : ""} onClick={() => setMode("demo")}>Demo</button>
              <button type="button" className={mode === "live" ? "active" : ""} onClick={() => setMode("live")}><i /> Live AI</button>
            </div>
          </div>
        </form>

        {error && <div className="error-banner">{error}</div>}
        {result.mode === "fallback" && (
          <div className="fallback-banner"><strong>Live AI fallback</strong><span>The deterministic retrieval pipeline completed this run because the model gateway was unavailable.</span></div>
        )}

        <div className={`decision-grid ${loading ? "is-loading" : ""}`}>
          <aside className="agent-panel panel">
            <div className="panel-title"><span>Agent activity</span><b>{result.trace.length} handoffs</b></div>
            <div className="agent-list">
              {result.trace.map((item, index) => {
                const meta = agentMeta[item.agent];
                return (
                  <article className="agent-step" key={`${item.agent}-${index}`}>
                    <div className={`agent-avatar ${meta.color}`}>{meta.code}</div>
                    <div>
                      <div className="agent-name"><strong>{item.agent}</strong><span>{item.durationMs} ms</span></div>
                      <p>{item.detail}</p>
                      <small className={item.status}>{item.status === "revised" ? "↻ Corrective pass" : "✓ Complete"}</small>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="query-plan">
              <span>Retrieval plan</span>
              {result.queries.map((query, index) => <p key={query}><b>Q{index + 1}</b>{query}</p>)}
            </div>
          </aside>

          <section className="answer-panel panel">
            <div className="panel-title answer-title">
              <div><span>Grounded recommendation</span><small>{result.mode === "live" ? "GPT-5.5 · AI Gateway" : "Deterministic demo · zero API keys"}</small></div>
              <ConfidenceRing value={result.confidence} />
            </div>
            <div className="answer-body">
              <div className="verdict"><i /> RECOMMENDATION</div>
              <h3>{verdictFor(result.question)}</h3>
              {result.answer.split("\n\n").map((paragraph, index) => (
                <p key={index}><CitationText text={paragraph} citations={result.citations} /></p>
              ))}
            </div>
            <div className="metric-row">
              <div><span>Documents scanned</span><strong>{result.metrics.documentsScanned}</strong></div>
              <div><span>Evidence selected</span><strong>{result.citations.length}</strong></div>
              <div><span>Critique rounds</span><strong>{result.metrics.critiqueRounds}</strong></div>
              <div><span>Pipeline time</span><strong>{result.metrics.totalDurationMs < 1000 ? `${result.metrics.totalDurationMs} ms` : `${(result.metrics.totalDurationMs / 1000).toFixed(1)} s`}</strong></div>
            </div>
          </section>

          <aside className="evidence-panel panel">
            <div className="panel-title"><span>Evidence ledger</span><b>{result.citations.length} grounded</b></div>
            <div className="evidence-list">
              {result.citations.map((citation) => (
                <button
                  id={`evidence-${citation.id}`}
                  className={`evidence-card ${selectedSource === citation.id ? "selected" : ""}`}
                  key={citation.id}
                  onClick={() => setSelectedSource(citation.id)}
                >
                  <div><code>{citation.id}</code><span className={`stance ${citation.stance}`}>{citation.stance}</span><b>{citation.score}</b></div>
                  <strong>{citation.title}</strong>
                  <small>{citation.source}</small>
                </button>
              ))}
            </div>
            {activeCitation && (
              <div className="source-preview">
                <span>Selected passage</span>
                <p>“{activeCitation.excerpt}”</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="architecture" id="architecture">
        <div className="eyebrow"><span>03</span> WHY THIS IS AGENTIC RAG</div>
        <div className="architecture-head">
          <h2>A corrective loop—not a prompt wrapped around vector search.</h2>
          <p>The critic can reject weak coverage and trigger a targeted second retrieval before synthesis. Every stage has a narrow role, typed output and observable handoff.</p>
        </div>
        <div className="architecture-flow" aria-label="Agentic RAG architecture">
          <div className="arch-node primary"><small>01</small><strong>Orchestrator</strong><span>Routes the decision</span></div>
          <i>→</i>
          <div className="arch-node"><small>02</small><strong>Planner agent</strong><span>Decomposes intent</span></div>
          <i>→</i>
          <div className="arch-node"><small>03</small><strong>Hybrid retrieval</strong><span>BM25 + vectors + RRF</span></div>
          <i>→</i>
          <div className="arch-node warning-node"><small>04</small><strong>Critic agent</strong><span>Grades + finds gaps</span></div>
          <i className="loop-arrow">↻</i>
          <div className="arch-node success-node"><small>05</small><strong>Synthesizer</strong><span>Answers with citations</span></div>
        </div>
        <div className="tech-grid">
          <article><span>RETRIEVAL</span><h3>Hybrid by design</h3><p>BM25 catches exact policy terms; concept-expanded vectors surface related operational evidence; reciprocal rank fusion balances both.</p></article>
          <article><span>RELIABILITY</span><h3>Graceful degradation</h3><p>Live agents run through Vercel AI Gateway. A deterministic evidence pipeline keeps the recruiter demo functional without secrets or quota.</p></article>
          <article><span>EVALUATION</span><h3>Observable quality</h3><p>Coverage, counter-evidence, citation validity, source diversity and latency are surfaced as first-class product metrics.</p></article>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>AtlasTrace</span></div>
        <p>Built as an evidence-first AI engineering portfolio project.</p>
        <span>Next.js · AI SDK · Vercel AI Gateway</span>
      </footer>
    </main>
  );
}
