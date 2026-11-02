"""The research pipeline as a LangGraph state machine.

    orchestrate -> plan -> retrieve -> critique --(gap, round 1)--> retrieve (corrective)
                                                \\-(covered)------> synthesize -> END

The corrective round re-runs the critic on the *merged* evidence, so passages
found by the second retrieval can actually be accepted, and the answer's
citations are audited against the evidence ledger before anything is returned.
Both modes run the same graph; only the agent implementations differ.
"""

from __future__ import annotations

import re
import time
from collections.abc import Callable
from typing import Any, Literal, TypedDict

from langgraph.graph import END, StateGraph

from . import i18n
from .agents import deterministic as det
from .agents import llm
from .retrieval import Hit, HybridIndex, get_index
from .schemas import AgentTrace, Citation, Metrics, ResearchResult
from .text import detect_language

CITATION = re.compile(r"\[([A-Z]+-\d+)\]")
FIRST_PASS_LIMIT = 6
CORRECTIVE_LIMIT = 3
MAX_ROUNDS = 2


class State(TypedDict, total=False):
    question: str
    locale: str
    mode: Literal["demo", "live"]
    q_lang: str
    intent: str
    queries: list[str]
    success_criteria: list[str]
    hits: list[Hit]
    accepted_ids: list[str]
    first_pass_accepted: list[str]  # kept so the evaluation can measure what the corrective loop changed
    coverage: float
    confidence: int
    missing: list[str]
    missing_perspective: str | None
    critic_note: str
    needs_revision: bool
    answerable: bool
    round: int
    verdict: str
    answer: str
    extracted_sentence: str
    trace: list[dict[str, Any]]


def _timed(state: State, agent: str, started: float, detail: str, revised: bool = False) -> list[dict[str, Any]]:
    entry = {
        "agent": agent,
        "detail": detail,
        "duration_ms": max(1, round((time.perf_counter() - started) * 1000)),
        "status": "revised" if revised else "complete",
    }
    return [*state.get("trace", []), entry]


def build_graph(index: HybridIndex) -> Any:
    def orchestrate(state: State) -> State:
        started = time.perf_counter()
        q_lang = detect_language(state["question"])
        intent = det.classify_intent(state["question"])
        locale = state["locale"]
        detail = i18n.t(locale, "orchestrator", q_lang_name=i18n.t(locale, f"lang_{q_lang}"), intent=i18n.t(locale, f"intent_{intent}"))
        return {"q_lang": q_lang, "intent": intent, "round": 0, "trace": _timed(state, "Orchestrator", started, detail)}

    def plan(state: State) -> State:
        started = time.perf_counter()
        if state["mode"] == "live":
            result = llm.plan(state["question"])
            queries, criteria = [state["question"], *result.queries][:4], result.success_criteria
        else:
            result = det.plan(state["question"])
            queries, criteria = result.queries, result.success_criteria
        detail = i18n.t(state["locale"], "planner", n_queries=len(queries))
        return {"queries": queries, "success_criteria": criteria, "trace": _timed(state, "Query Planner", started, detail)}

    def retrieve(state: State) -> State:
        started = time.perf_counter()
        current_round = state.get("round", 0) + 1
        locale = state["locale"]
        if current_round == 1:
            hits = index.search(state["queries"], limit=FIRST_PASS_LIMIT)
            detail = i18n.t(locale, "retriever", n_docs=len(index.docs) // 2, n_hits=len(hits))
            return {"hits": hits, "round": current_round, "trace": _timed(state, "Hybrid Retriever", started, detail)}

        if state["mode"] == "live":
            queries = [state["missing_perspective"] or state["question"]]
            missing_label = state["missing_perspective"] or ""
        else:
            queries = det.corrective_queries(state["question"], det.Critique([], 0, 0, state["missing"], True))
            missing_label = ", ".join(state["missing"])
        seen = [hit.passage.id for hit in state["hits"]]
        new_hits = index.search(queries, limit=CORRECTIVE_LIMIT, exclude=seen)
        detail = i18n.t(locale, "retriever_corrective", missing=missing_label, n_new=len(new_hits))
        return {"hits": [*state["hits"], *new_hits], "round": current_round, "trace": _timed(state, "Hybrid Retriever", started, detail, revised=True)}

    def critique(state: State) -> State:
        started = time.perf_counter()
        locale, hits = state["locale"], state["hits"]
        measured = det.critique(state["question"], hits, index)  # coverage is always measured, in both modes
        first_round = state["round"] == 1

        if state["mode"] == "live":
            result = llm.critique(state["question"], state["success_criteria"], hits, state["q_lang"])
            known = {hit.passage.id for hit in hits}
            accepted = [pid for pid in result.accepted_ids if pid in known] or measured.accepted_ids
            needs_revision = bool(result.missing_perspective) and first_round
            update: State = {
                "accepted_ids": accepted,
                "confidence": result.confidence,
                "missing_perspective": result.missing_perspective,
                "critic_note": result.critique,
            }
            detail = result.critique
        else:
            needs_revision = measured.needs_revision and first_round
            update = {
                "accepted_ids": measured.accepted_ids,
                "confidence": measured.confidence,
                "missing": measured.missing_terms,
                "answerable": measured.answerable,
                "critic_note": "",
            }
            coverage = round(measured.coverage * 100)
            if needs_revision:
                detail = i18n.t(locale, "critic_gap", coverage=coverage, missing=", ".join(measured.missing_terms))
            elif first_round:
                detail = i18n.t(locale, "critic_ok", n_accepted=len(measured.accepted_ids), coverage=coverage)
            else:
                detail = i18n.t(locale, "critic_after", n_accepted=len(measured.accepted_ids), coverage=coverage)

        if first_round:
            update["first_pass_accepted"] = list(update["accepted_ids"])
        return {
            **update,
            "coverage": measured.coverage,
            "needs_revision": needs_revision,
            "trace": _timed(state, "Evidence Critic", started, detail, revised=needs_revision),
        }

    def synthesize(state: State) -> State:
        started = time.perf_counter()
        locale = state["locale"]
        by_id = {hit.passage.id: hit for hit in state["hits"]}
        accepted = [by_id[pid] for pid in state["accepted_ids"] if pid in by_id]

        if state["mode"] == "live":
            result = llm.synthesize(state["question"], locale, accepted, state.get("critic_note", ""))
            answer, verdict = result.answer, result.headline
            confidence = round((state["confidence"] + result.confidence) / 2)
            extracted = ""
        else:
            measured = det.Critique(
                state["accepted_ids"], state["coverage"], state["confidence"], state.get("missing", []), False, state.get("answerable", True)
            )
            result = det.synthesize(state["question"], state["q_lang"], locale, accepted, measured, index, i18n.MESSAGES[locale])
            answer, verdict, confidence, extracted = result.answer, result.verdict, state["confidence"], result.extracted_sentence

        return {
            "answer": answer,
            "verdict": verdict,
            "confidence": confidence,
            "extracted_sentence": extracted,
            "trace": _timed(state, "Answer Synthesizer", started, ""),
        }

    def route_after_critique(state: State) -> str:
        return "retrieve" if state.get("needs_revision") and state["round"] < MAX_ROUNDS else "synthesize"

    graph = StateGraph(State)
    for name, node in (("orchestrate", orchestrate), ("plan", plan), ("retrieve", retrieve), ("critique", critique), ("synthesize", synthesize)):
        graph.add_node(name, node)
    graph.set_entry_point("orchestrate")
    graph.add_edge("orchestrate", "plan")
    graph.add_edge("plan", "retrieve")
    graph.add_edge("retrieve", "critique")
    graph.add_conditional_edges("critique", route_after_critique, {"retrieve": "retrieve", "synthesize": "synthesize"})
    graph.add_edge("synthesize", END)
    return graph.compile()


_GRAPH: Any = None


def get_graph() -> Any:
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_graph(get_index())
    return _GRAPH


def audit_citations(answer: str, ledger_ids: set[str]) -> tuple[str, list[str], int]:
    """Drop citations that point outside the evidence ledger; return the cleaned answer, cited ids, and the drop count."""
    removed = 0

    def keep(match: re.Match[str]) -> str:
        nonlocal removed
        if match.group(1) in ledger_ids:
            return match.group(0)
        removed += 1
        return ""

    cleaned = re.sub(r" ?" + CITATION.pattern, keep, answer)
    cited = list(dict.fromkeys(CITATION.findall(cleaned)))
    return cleaned, cited, removed


def _to_result(state: State, mode: str, started: float, fallback_reason: str | None) -> ResearchResult:
    locale = state["locale"]
    by_id = {hit.passage.id: hit for hit in state["hits"]}
    ledger = [by_id[pid] for pid in state["accepted_ids"] if pid in by_id]
    answer, cited, removed = audit_citations(state["answer"], {hit.passage.id for hit in ledger})

    trace = state["trace"]
    synth_key = "synth_live" if mode == "live" else "synth"
    removed_note = i18n.t(locale, "removed", n=removed) if removed else ""
    trace[-1]["detail"] = i18n.t(locale, synth_key, n_cited=len(cited), removed=removed_note)

    citations = [
        Citation(
            id=hit.passage.id,
            title=hit.passage.title,
            source=i18n.t(locale, "source"),
            excerpt=hit.passage.text(locale),
            score=round(hit.fused * 100),
            stance="support" if hit.passage.id in cited else "context",
        )
        for hit in ledger
    ]
    return ResearchResult(
        question=state["question"],
        locale=locale,
        mode=mode,
        verdict=state["verdict"],
        answer=answer,
        confidence=state["confidence"],
        queries=state["queries"],
        citations=citations,
        trace=[AgentTrace(**entry) for entry in trace],
        metrics=Metrics(
            documents_scanned=len(get_index().docs) // 2,
            passages_retrieved=len(state["hits"]),
            critique_rounds=state["round"],
            total_duration_ms=max(1, round((time.perf_counter() - started) * 1000)),
            query_coverage=round(state["coverage"] * 100),
            citations_removed=removed,
        ),
        fallback_reason=fallback_reason,
    )


def run_state(question: str, locale: str = "en", mode: str = "demo") -> State:
    return get_graph().invoke({"question": question, "locale": locale, "mode": mode})


def run_research(question: str, locale: str = "en", mode: str = "demo", on_fallback: Callable[[Exception], None] | None = None) -> ResearchResult:
    started = time.perf_counter()
    if mode == "live":
        try:
            return _to_result(run_state(question, locale, "live"), "live", started, None)
        except Exception as error:  # any gateway, network or schema failure degrades to the deterministic run
            if on_fallback:
                on_fallback(error)
            reason = i18n.t(locale, "no_gateway") if isinstance(error, llm.MissingCredential) else str(error)[:180]
            return _to_result(run_state(question, locale, "demo"), "fallback", started, reason)
    return _to_result(run_state(question, locale, "demo"), "demo", started, None)


__all__ = ["run_research", "run_state", "audit_citations"]
