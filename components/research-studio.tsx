"use client";

import { FormEvent, useEffect, useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/locale";
import type { Citation, ResearchResult } from "@/lib/rag/types";

const agentMeta = {
  Orchestrator: { code: "OR", color: "violet" },
  "Query Planner": { code: "QP", color: "blue" },
  "Hybrid Retriever": { code: "HR", color: "cyan" },
  "Evidence Critic": { code: "EC", color: "amber" },
  "Answer Synthesizer": { code: "AS", color: "green" },
} as const;

function CitationText({ text, citations, label }: { text: string; citations: Citation[]; label: string }) {
  const knownIds = new Set(citations.map((citation) => citation.id));
  return text.split(/(\[[A-Z]+-\d+\])/g).map((part, index) => {
    const id = part.slice(1, -1);
    if (!knownIds.has(id)) return part;
    return (
      <button
        className="inline-citation"
        key={`${part}-${index}`}
        onClick={() => document.getElementById(`evidence-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        aria-label={`${label} ${id}`}
      >
        {id}
      </button>
    );
  });
}

function ConfidenceRing({ value, aria, label }: { value: number; aria: string; label: string }) {
  const style = { "--confidence": `${value * 3.6}deg` } as React.CSSProperties;
  return (
    <div className="confidence-ring" style={style} aria-label={`${value}% ${aria}`}>
      <div>
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function ResearchStudio({ initialResults }: { initialResults: Record<Locale, ResearchResult> }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [question, setQuestion] = useState(initialResults[defaultLocale].question);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [result, setResult] = useState(initialResults[defaultLocale]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState(initialResults[defaultLocale].citations[0]?.id ?? "");

  const d = getDictionary(locale);
  const stanceLabels: Record<Citation["stance"], string> = {
    support: d.stanceSupport,
    context: d.stanceContext,
    risk: d.stanceRisk,
  };
  const activeCitation = result.citations.find((citation) => citation.id === selectedSource) ?? result.citations[0];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function applyResult(next: ResearchResult) {
    setResult(next);
    setSelectedSource(next.citations[0]?.id ?? "");
  }

  async function runResearch(event?: FormEvent, overrides?: { locale?: Locale; question?: string }) {
    event?.preventDefault();
    const activeLocale = overrides?.locale ?? locale;
    const activeQuestion = overrides?.question ?? question;
    if (activeQuestion.trim().length < 12 || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: activeQuestion, mode, locale: activeLocale }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? getDictionary(activeLocale).errorGeneric);
      applyResult(payload as ResearchResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : getDictionary(activeLocale).errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Untouched pages swap to the pre-rendered result for the new language; once
   * the reader has asked their own question, it is re-run in that language.
   */
  function changeLocale(next: Locale) {
    if (next === locale || loading) return;
    const pristine = question === initialResults[locale].question;
    setLocale(next);

    if (pristine) {
      setQuestion(initialResults[next].question);
      applyResult(initialResults[next]);
      setError(null);
      return;
    }

    void runResearch(undefined, { locale: next });
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AtlasTrace">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>AtlasTrace</span>
          <small>{d.brandTagline}</small>
        </a>
        <nav aria-label="AtlasTrace">
          <a href="#decision-room">{d.navDecisionRoom}</a>
          <a href="#architecture">{d.navArchitecture}</a>
          <a href="https://github.com/nguyenddung/RAG" target="_blank" rel="noreferrer">{d.navSource} ↗</a>
        </nav>
        <div className="topbar-end">
          <div className="lang-switch" role="group" aria-label={d.switchLanguage}>
            {locales.map((option) => (
              <button
                type="button"
                key={option}
                className={option === locale ? "active" : ""}
                onClick={() => changeLocale(option)}
                aria-pressed={option === locale}
                lang={option}
              >
                {getDictionary(option).localeShort}
              </button>
            ))}
          </div>
          <div className="system-status"><i /> {d.systemReady}</div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>01</span> {d.painEyebrow}</div>
        <div className="hero-grid">
          <div>
            <h1>{d.heroTitleLead} <em>{d.heroTitleEmphasis}</em></h1>
            <p className="hero-copy">{d.heroCopy}</p>
          </div>
          <aside className="pain-card">
            <div className="pain-card-top"><span>{d.briefLabel}</span><b>{d.briefStatus}</b></div>
            <h2>{d.briefQuestion}</h2>
            <div className="conflict-row"><span>{d.briefOperations}</span><strong className="positive">{d.briefOperationsValue}</strong></div>
            <div className="conflict-row"><span>{d.briefFinance}</span><strong>{d.briefFinanceValue}</strong></div>
            <div className="conflict-row"><span>{d.briefData}</span><strong className="warning">{d.briefDataValue}</strong></div>
            <div className="conflict-row"><span>{d.briefRisk}</span><strong className="danger">{d.briefRiskValue}</strong></div>
            <p>{d.briefFooter}</p>
          </aside>
        </div>
        <div className="solution-strip">
          <span>{d.solutionStrip}</span>
          <div><b>{d.stepPlan}</b><i>→</i><b>{d.stepRetrieve}</b><i>→</i><b>{d.stepCritique}</b><i>↻</i><b>{d.stepSynthesize}</b></div>
        </div>
      </section>

      <section className="workspace-section" id="decision-room">
        <div className="section-heading">
          <div><span className="section-number">02</span><p>{d.workspaceEyebrow}</p></div>
          <h2>{d.workspaceTitle}</h2>
          <p>{d.workspaceCopy}</p>
        </div>

        <form className="query-console" onSubmit={runResearch}>
          <div className="query-label"><span>{d.queryLabel}</span><small>{question.length}/500</small></div>
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
              aria-label={d.queryAria}
            />
            <button type="submit" disabled={loading || question.trim().length < 12}>
              {loading ? <><span className="spinner" /> {d.runningAgents}</> : <>{d.runResearch} <span>⌘↵</span></>}
            </button>
          </div>
          <div className="console-footer">
            <div className="samples">
              {d.sampleQuestions.map((sample, index) => (
                <button type="button" key={sample} onClick={() => setQuestion(sample)}>{String(index + 1).padStart(2, "0")} {sample.split("?")[0]}</button>
              ))}
            </div>
            <div className="mode-switch" role="group" aria-label={d.modeGroup}>
              <button type="button" className={mode === "demo" ? "active" : ""} aria-pressed={mode === "demo"} onClick={() => setMode("demo")}>{d.modeDemo}</button>
              <button type="button" className={mode === "live" ? "active" : ""} aria-pressed={mode === "live"} onClick={() => setMode("live")}><i /> {d.modeLive}</button>
            </div>
          </div>
        </form>

        {error && <div className="error-banner" role="alert">{error}</div>}
        {result.mode === "fallback" && (
          <div className="fallback-banner" role="status"><strong>{d.fallbackTitle}</strong><span>{d.fallbackBody}</span></div>
        )}

        <div className={`decision-grid ${loading ? "is-loading" : ""}`}>
          <aside className="agent-panel panel">
            <div className="panel-title"><span>{d.agentActivity}</span><b>{result.trace.length} {d.handoffs}</b></div>
            <div className="agent-list">
              {result.trace.map((item, index) => {
                const meta = agentMeta[item.agent];
                return (
                  <article className="agent-step" key={`${item.agent}-${index}`}>
                    <div className={`agent-avatar ${meta.color}`}>{meta.code}</div>
                    <div>
                      <div className="agent-name"><strong>{d.agentNames[item.agent]}</strong><span>{item.durationMs} ms</span></div>
                      <p>{item.detail}</p>
                      <small className={item.status}>{item.status === "revised" ? `↻ ${d.statusRevised}` : `✓ ${d.statusComplete}`}</small>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="query-plan">
              <span>{d.retrievalPlan}</span>
              {result.queries.map((query, index) => <p key={query}><b>Q{index + 1}</b>{query}</p>)}
            </div>
          </aside>

          <section className="answer-panel panel">
            <div className="panel-title answer-title">
              <div><span>{d.groundedRecommendation}</span><small>{result.mode === "live" ? d.sourceLive : d.sourceDemo}</small></div>
              <ConfidenceRing value={result.confidence} aria={d.confidenceAria} label={d.confidenceLabel} />
            </div>
            <div className="answer-body">
              <div className="verdict"><i /> {d.recommendation}</div>
              <h3>{result.verdict}</h3>
              {result.answer.split("\n\n").map((paragraph, index) => (
                <p key={index}><CitationText text={paragraph} citations={result.citations} label={d.viewSource} /></p>
              ))}
            </div>
            <div className="metric-row">
              <div><span>{d.metricDocuments}</span><strong>{result.metrics.documentsScanned}</strong></div>
              <div><span>{d.metricEvidence}</span><strong>{result.citations.length}</strong></div>
              <div><span>{d.metricRounds}</span><strong>{result.metrics.critiqueRounds}</strong></div>
              <div><span>{d.metricTime}</span><strong>{result.metrics.totalDurationMs < 1000 ? `${result.metrics.totalDurationMs} ms` : `${(result.metrics.totalDurationMs / 1000).toFixed(1)} s`}</strong></div>
            </div>
          </section>

          <aside className="evidence-panel panel">
            <div className="panel-title"><span>{d.evidenceLedger}</span><b>{result.citations.length} {d.evidenceGrounded}</b></div>
            <div className="evidence-list">
              {result.citations.map((citation) => (
                <button
                  id={`evidence-${citation.id}`}
                  className={`evidence-card ${selectedSource === citation.id ? "selected" : ""}`}
                  key={citation.id}
                  onClick={() => setSelectedSource(citation.id)}
                >
                  <div><code>{citation.id}</code><span className={`stance ${citation.stance}`}>{stanceLabels[citation.stance]}</span><b>{citation.score}</b></div>
                  <strong>{citation.title}</strong>
                  <small>{citation.source}</small>
                </button>
              ))}
            </div>
            {activeCitation && (
              <div className="source-preview">
                <span>{d.selectedPassage}</span>
                <p>“{activeCitation.excerpt}”</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="architecture" id="architecture">
        <div className="eyebrow"><span>03</span> {d.archEyebrow}</div>
        <div className="architecture-head">
          <h2>{d.archTitle}</h2>
          <p>{d.archCopy}</p>
        </div>
        <div className="architecture-flow" aria-label={d.archAria}>
          <div className="arch-node primary"><small>01</small><strong>{d.archOrchestrator}</strong><span>{d.archOrchestratorCopy}</span></div>
          <i>→</i>
          <div className="arch-node"><small>02</small><strong>{d.archPlanner}</strong><span>{d.archPlannerCopy}</span></div>
          <i>→</i>
          <div className="arch-node"><small>03</small><strong>{d.archRetrieval}</strong><span>{d.archRetrievalCopy}</span></div>
          <i>→</i>
          <div className="arch-node warning-node"><small>04</small><strong>{d.archCritic}</strong><span>{d.archCriticCopy}</span></div>
          <i className="loop-arrow">↻</i>
          <div className="arch-node success-node"><small>05</small><strong>{d.archSynthesizer}</strong><span>{d.archSynthesizerCopy}</span></div>
        </div>
        <div className="tech-grid">
          <article><span>{d.techRetrievalTag}</span><h3>{d.techRetrievalTitle}</h3><p>{d.techRetrievalCopy}</p></article>
          <article><span>{d.techReliabilityTag}</span><h3>{d.techReliabilityTitle}</h3><p>{d.techReliabilityCopy}</p></article>
          <article><span>{d.techEvaluationTag}</span><h3>{d.techEvaluationTitle}</h3><p>{d.techEvaluationCopy}</p></article>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>AtlasTrace</span></div>
        <p>{d.footerCopy}</p>
        <span>{d.footerStack}</span>
      </footer>
    </main>
  );
}
