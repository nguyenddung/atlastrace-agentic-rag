"""API contract. Field names are camelCase on the wire to match the Next.js client types."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Locale = Literal["en", "vi"]
Mode = Literal["demo", "live"]
AgentName = Literal["Orchestrator", "Query Planner", "Hybrid Retriever", "Evidence Critic", "Answer Synthesizer"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ResearchRequest(CamelModel):
    question: str = Field(min_length=12, max_length=500)
    mode: Mode = "demo"
    locale: Locale = "en"


class AgentTrace(CamelModel):
    agent: AgentName
    detail: str
    duration_ms: int
    status: Literal["complete", "revised"]


class Citation(CamelModel):
    id: str
    title: str
    source: str
    excerpt: str
    score: int
    stance: Literal["support", "context"]


class Metrics(CamelModel):
    documents_scanned: int
    passages_retrieved: int
    critique_rounds: int
    total_duration_ms: int
    query_coverage: int  # % of question terms found in accepted evidence
    citations_removed: int  # citations dropped because they pointed outside the ledger


class ResearchResult(CamelModel):
    question: str
    locale: Locale
    mode: Literal["demo", "live", "fallback"]
    verdict: str
    answer: str
    confidence: int
    queries: list[str]
    citations: list[Citation]
    trace: list[AgentTrace]
    metrics: Metrics
    fallback_reason: str | None = None
