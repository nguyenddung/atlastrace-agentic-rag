"""Live agents: the same three roles, backed by a hosted model through Vercel AI Gateway.

AI Gateway exposes an OpenAI-compatible endpoint, so the standard OpenAI SDK
works against it and the model can be swapped with RESEARCH_MODEL_ID without
code changes. Every response is validated with Pydantic; a malformed reply
raises, and the orchestrator falls back to the deterministic pipeline.
"""

from __future__ import annotations

import json
import os
from typing import TypeVar

from pydantic import BaseModel, Field

from ..retrieval import Hit

DEFAULT_MODEL = "openai/gpt-5.6-sol"
GATEWAY_URL = "https://ai-gateway.vercel.sh/v1"
T = TypeVar("T", bound=BaseModel)


class MissingCredential(RuntimeError):
    pass


class LivePlan(BaseModel):
    intent: str
    queries: list[str] = Field(min_length=2, max_length=4)
    success_criteria: list[str] = Field(min_length=1, max_length=5)


class LiveCritique(BaseModel):
    accepted_ids: list[str] = Field(min_length=1, max_length=4)
    confidence: int = Field(ge=0, le=100)
    critique: str
    missing_perspective: str | None = None


class LiveAnswer(BaseModel):
    headline: str
    answer: str
    cited_ids: list[str] = Field(min_length=1, max_length=4)
    confidence: int = Field(ge=0, le=100)


PLANNER = (
    "You are the query-planning agent of a retrieval system over English and Vietnamese Wikipedia passages. "
    "Decompose the question into 2-4 short, diverse search queries (keep names and numbers exactly; you may add "
    "an English and a Vietnamese phrasing). Do not answer. Reply with JSON: "
    '{"intent": str, "queries": [str], "success_criteria": [str]}'
)
CRITIC = (
    "You are the evidence critic. Accept only passages that directly help answer the question, by their exact ID. "
    "If something the question asks about is not covered, name it in missing_perspective as a short search query; "
    "otherwise use null. Never invent IDs. Reply with JSON: "
    '{"accepted_ids": [str], "confidence": int, "critique": str, "missing_perspective": str | null}'
)
SYNTHESIZER = (
    "You are the answer synthesizer. Answer only from the supplied evidence, in the language named by ANSWER LANGUAGE. "
    "Cite every claim with the exact passage ID in square brackets, e.g. [XQ-012]. If the evidence does not contain "
    "the answer, say so. headline is a one-sentence direct answer. Reply with JSON: "
    '{"headline": str, "answer": str, "cited_ids": [str], "confidence": int}'
)


def _client():
    from openai import OpenAI

    key = os.getenv("AI_GATEWAY_API_KEY") or os.getenv("VERCEL_OIDC_TOKEN")
    if not key:
        raise MissingCredential("no AI Gateway credential")
    return OpenAI(api_key=key, base_url=os.getenv("AI_GATEWAY_BASE_URL", GATEWAY_URL), timeout=25, max_retries=1)


def _ask(system: str, prompt: str, schema: type[T]) -> T:
    response = _client().chat.completions.create(
        model=os.getenv("RESEARCH_MODEL_ID", DEFAULT_MODEL),
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return schema.model_validate(json.loads(response.choices[0].message.content or "{}"))


def format_evidence(hits: list[Hit], lang: str) -> str:
    return "\n\n---\n\n".join(f"ID: {hit.passage.id}\nTITLE: {hit.passage.title}\nTEXT: {hit.passage.text(lang)}" for hit in hits)


def plan(question: str) -> LivePlan:
    return _ask(PLANNER, question, LivePlan)


def critique(question: str, success_criteria: list[str], hits: list[Hit], lang: str) -> LiveCritique:
    prompt = f"QUESTION:\n{question}\n\nSUCCESS CRITERIA:\n" + "\n".join(success_criteria) + f"\n\nCANDIDATE EVIDENCE:\n{format_evidence(hits, lang)}"
    return _ask(CRITIC, prompt, LiveCritique)


def synthesize(question: str, locale: str, hits: list[Hit], critic_note: str) -> LiveAnswer:
    language = "Vietnamese" if locale == "vi" else "English"
    prompt = f"ANSWER LANGUAGE:\n{language}\n\nQUESTION:\n{question}\n\nEVIDENCE:\n{format_evidence(hits, locale)}\n\nCRITIC NOTE:\n{critic_note}"
    return _ask(SYNTHESIZER, prompt, LiveAnswer)
