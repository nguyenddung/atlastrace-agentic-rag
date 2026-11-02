import re

import pytest

from atlastrace.agents import deterministic as det
from atlastrace.corpus import load_passages, load_questions
from atlastrace.graph import audit_citations, run_research, run_state
from atlastrace.retrieval import get_index
from atlastrace.text import deaccent, detect_language, split_sentences, tokenize

CITED = re.compile(r"\[([A-Z]+-\d+)\]")


def test_dataset_is_aligned_and_complete():
    passages = load_passages()
    questions = load_questions()
    assert len(passages) == 240
    assert len(questions) == 1190
    ids = {passage.id for passage in passages}
    assert all(question.passage_id in ids for question in questions)
    assert all(passage.text_en and passage.text_vi for passage in passages)


def test_text_normalisation():
    assert deaccent("Đội thủ triển khai") == "Doi thu trien khai"
    assert detect_language("Đội thủ Panthers đã thua bao nhiêu điểm?") == "vi"
    assert detect_language("How many points did the Panthers defense surrender?") == "en"
    assert "doi_thu" in tokenize("Đội thủ Panthers")  # syllable bigram
    assert len(split_sentences("One sentence. Two sentences! Three?")) == 3


@pytest.mark.parametrize("lang", ["en", "vi"])
def test_retrieval_finds_gold_passage(lang):
    index = get_index()
    sample = load_questions()[::40]
    hits_at_5 = sum(q.passage_id in [h.passage.id for h in index.search([q.question(lang)], limit=5)] for q in sample)
    assert hits_at_5 / len(sample) >= 0.9


def test_bilingual_index_beats_english_only_for_vietnamese_questions():
    sample = load_questions()[::20]
    bilingual, english_only = get_index(("en", "vi")), get_index(("en",))

    def recall(index):
        return sum(q.passage_id in [h.passage.id for h in index.search([q.question_vi], limit=5)] for q in sample)

    assert recall(bilingual) > recall(english_only) + 0.3 * len(sample)


@pytest.mark.parametrize(
    "question,locale",
    [
        ("How many points did the Panthers defense surrender?", "en"),
        ("Đội thủ Panthers đã thua bao nhiêu điểm?", "vi"),
        ("Đội thủ Panthers đã thua bao nhiêu điểm?", "en"),
    ],
)
def test_every_citation_in_the_answer_is_in_the_ledger(question, locale):
    result = run_research(question, locale)
    ledger = {citation.id for citation in result.citations}
    assert result.citations
    assert set(CITED.findall(result.answer)) <= ledger
    assert result.metrics.citations_removed == 0
    assert "308" in result.answer


def test_cross_locale_answer_is_rendered_in_the_readers_language():
    result = run_research("How many points did the Panthers defense surrender?", "vi")
    assert detect_language(result.answer) == "vi"
    assert detect_language(result.citations[0].excerpt) == "vi"
    assert result.trace[0].detail.startswith("Nhận diện")


def test_corrective_round_can_accept_new_evidence():
    """Regression for the old bug: evidence found by the corrective retrieval must be eligible for acceptance."""
    question = "Who designed the alternating current induction motor?"
    state = run_state(question, "en", "demo")
    assert state["round"] == 2
    first_pass = {hit.passage.id for hit in state["hits"][:6]}
    corrective = {hit.passage.id for hit in state["hits"][6:]}
    assert corrective and not (corrective & first_pass)
    # The critic re-grades the merged list, so the accepted set is drawn from all of it.
    assert set(state["accepted_ids"]) <= first_pass | corrective


def test_out_of_corpus_question_is_flagged_not_answered():
    result = run_research("How does a blockchain consensus algorithm work?", "en")
    assert result.confidence <= 45
    assert "no clear answer" in result.verdict


def test_trace_durations_are_measured_not_canned():
    result = run_research("When did Martin Luther publish the Ninety-five Theses?", "en")
    agents = [step.agent for step in result.trace]
    assert agents[0] == "Orchestrator" and agents[-1] == "Answer Synthesizer"
    assert result.metrics.critique_rounds == agents.count("Evidence Critic")
    assert all(step.duration_ms >= 1 for step in result.trace)


def test_audit_drops_citations_outside_the_ledger():
    cleaned, cited, removed = audit_citations("Fact one [XQ-001]. Made up [XQ-999].", {"XQ-001"})
    assert cleaned == "Fact one [XQ-001]. Made up."
    assert cited == ["XQ-001"]
    assert removed == 1


def test_live_mode_without_credentials_falls_back(monkeypatch):
    monkeypatch.delenv("AI_GATEWAY_API_KEY", raising=False)
    monkeypatch.delenv("VERCEL_OIDC_TOKEN", raising=False)
    result = run_research("How many points did the Panthers defense surrender?", "en", "live")
    assert result.mode == "fallback"
    assert result.fallback_reason


def test_intent_classification_is_bilingual():
    assert det.classify_intent("How many points did they score?") == "quantity"
    assert det.classify_intent("Đội thủ Panthers đã thua bao nhiêu điểm?") == "quantity"
    assert det.classify_intent("Ai là người dịch Kinh Thánh?") == "person"


def test_live_path_with_a_stub_model(monkeypatch):
    """Exercise the live graph without a network: the critic asks for a second pass, accepts
    a passage that only the corrective retrieval found, and the synthesizer cites one real and
    one invented passage. The invented one must be stripped and counted."""
    from atlastrace.agents import llm

    calls = {"critique": 0}

    def fake_plan(question):
        return llm.LivePlan(intent="quantity", queries=["Panthers defense points", "Panthers interceptions"], success_criteria=["state the number"])

    def fake_critique(question, criteria, hits, lang):
        calls["critique"] += 1
        if calls["critique"] == 1:
            return llm.LiveCritique(
                accepted_ids=[hits[0].passage.id], confidence=60, critique="Need Broncos context.", missing_perspective="Denver Broncos defense"
            )
        return llm.LiveCritique(accepted_ids=[hits[0].passage.id, hits[-1].passage.id], confidence=80, critique="Covered.", missing_perspective=None)

    def fake_synthesize(question, locale, hits, note):
        return llm.LiveAnswer(
            headline="308 points.", answer=f"They allowed 308 points [{hits[0].passage.id}] [XQ-999].", cited_ids=[hits[0].passage.id], confidence=90
        )

    monkeypatch.setattr(llm, "plan", fake_plan)
    monkeypatch.setattr(llm, "critique", fake_critique)
    monkeypatch.setattr(llm, "synthesize", fake_synthesize)

    result = run_research("How many points did the Panthers defense surrender?", "en", "live")
    assert result.mode == "live"
    assert result.metrics.critique_rounds == 2
    assert calls["critique"] == 2  # the critic re-grades the merged evidence
    assert len(result.citations) == 2  # includes a passage found only in the corrective pass
    assert "XQ-999" not in result.answer
    assert result.metrics.citations_removed == 1
    assert result.verdict == "308 points."
