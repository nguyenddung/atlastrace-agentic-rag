"""Deterministic planner, critic and synthesizer.

They power Demo mode (no API key, no quota) and are the fallback when the live
model fails. Nothing here is canned: every plan, critique and answer is
computed from the question and the retrieved passages.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..retrieval import Hit, HybridIndex
from ..text import STOP_WORDS, deaccent, split_sentences, tokenize, words

WORD = re.compile(r"[^\W_]+(?:[-'’][^\W_]+)*", re.UNICODE)
ENTITY = re.compile(r"\b(?:[A-ZÀ-Ỹ][\w'’-]*|\d[\d,.]*)(?:\s+(?:of\s+|the\s+|de\s+)?(?:[A-ZÀ-Ỹ][\w'’-]*|\d[\d,.]*))*")

INTENT_PATTERNS = [
    ("quantity", r"\b(how many|how much|bao nhieu|may)\b"),
    ("time", r"\b(when|what year|which year|khi nao|nam nao|luc nao|bao gio|thoi gian nao)\b"),
    ("person", r"\b(who|whom|whose|ai)\b"),
    ("place", r"\b(where|o dau|noi nao|cho nao)\b"),
    ("reason", r"\b(why|tai sao|vi sao|vi le gi)\b"),
]

ACCEPT_FUSED = 0.5  # minimum relative RRF score for a passage to be accepted
ACCEPT_COVERAGE = 0.35  # minimum share of (IDF-weighted) question terms a passage must contain
ANSWERABLE_COVERAGE = 0.4  # the best passage must cover at least this much to be treated as an answer
COVERAGE_TARGET = 0.75  # below this, the critic asks for a corrective retrieval
MAX_ACCEPTED = 4


@dataclass
class Plan:
    intent: str
    queries: list[str]
    success_criteria: list[str] = field(default_factory=list)


@dataclass
class Critique:
    accepted_ids: list[str]
    coverage: float
    confidence: int
    missing_terms: list[str]
    needs_revision: bool
    answerable: bool = True


@dataclass
class Synthesis:
    verdict: str
    answer: str
    cited_ids: list[str]
    extracted_sentence: str  # in the question's language, used by the evaluator


def classify_intent(question: str) -> str:
    folded = deaccent(question.lower())
    for intent, pattern in INTENT_PATTERNS:
        if re.search(pattern, folded):
            return intent
    return "fact"


def content_words(question: str) -> list[str]:
    """Question words with stop words removed, in their original spelling."""
    seen: set[str] = set()
    kept: list[str] = []
    for word in WORD.findall(question):
        folded = deaccent(word.lower())
        if (folded in STOP_WORDS or len(folded) < 2) and not folded.isdigit():
            continue
        if folded not in seen:
            seen.add(folded)
            kept.append(word)
    return kept


def entities(question: str) -> list[str]:
    found = []
    for match in ENTITY.finditer(question):
        phrase = match.group(0).strip()
        # Skip a lone capitalised first word ("What", "Ai") that is just sentence case.
        if match.start() == 0 and " " not in phrase and not phrase[0].isdigit():
            continue
        if deaccent(phrase.lower()) not in STOP_WORDS:
            found.append(phrase)
    return found


def plan(question: str) -> Plan:
    keywords = " ".join(content_words(question))
    named = " ".join(entities(question))
    queries: list[str] = []
    for query in (question.strip(), keywords, named):
        if query and query not in queries:
            queries.append(query)
    return Plan(intent=classify_intent(question), queries=queries, success_criteria=["cover every key term", "cite the passage that states the answer"])


def _terms(text: str) -> set[str]:
    return set(words(text))


def _weighted_coverage(question_terms: set[str], text_terms: set[str], weights: dict[str, float]) -> float:
    total = sum(weights.values()) or 1.0
    return sum(weight for term, weight in weights.items() if term in text_terms) / total


def critique(question: str, hits: list[Hit], index: HybridIndex) -> Critique:
    question_terms = _terms(question)
    if not hits or not question_terms:
        return Critique([], 0.0, 0, sorted(question_terms), bool(question_terms), answerable=False)

    weights = {term: index.idf.get(term, 1.0) for term in question_terms}
    hit_terms = {hit.passage.id: _terms(f"{hit.passage.title} {hit.passage.text(hit.lang)}") for hit in hits}
    per_hit = {pid: _weighted_coverage(question_terms, terms, weights) for pid, terms in hit_terms.items()}
    best = max(per_hit.values())

    floor = max(ACCEPT_COVERAGE, 0.6 * best)
    accepted = [hit for hit in hits if hit.fused >= ACCEPT_FUSED and per_hit[hit.passage.id] >= floor][:MAX_ACCEPTED]
    if not accepted:
        accepted = [max(hits, key=lambda hit: per_hit[hit.passage.id])]
    covered = set().union(*(hit_terms[hit.passage.id] for hit in accepted))
    coverage = _weighted_coverage(question_terms, covered, weights)
    missing = sorted((term for term in question_terms if term not in covered), key=lambda term: -weights[term])

    # A clear winner is more trustworthy than a tie between passages.
    runner_up = sorted((hit.fused for hit in hits), reverse=True)[1] if len(hits) > 1 else 0.0
    margin = 1.0 - runner_up
    answerable = best >= ANSWERABLE_COVERAGE
    confidence = round(30 + 65 * (0.6 * best + 0.25 * coverage + 0.15 * margin))
    if not answerable:
        confidence = min(confidence, 45)
    return Critique(
        accepted_ids=[hit.passage.id for hit in accepted],
        coverage=coverage,
        confidence=max(0, min(95, confidence)),
        missing_terms=missing[:4],
        needs_revision=coverage < COVERAGE_TARGET and bool(missing),
        answerable=answerable,
    )


def corrective_queries(question: str, critique_result: Critique) -> list[str]:
    """Re-ask with the uncovered terms, keeping the original question as an anchor."""
    lookup = {deaccent(word.lower()): word for word in content_words(question)}
    missing = " ".join(lookup.get(term, term) for term in critique_result.missing_terms)
    return [query for query in (missing, f"{missing} {' '.join(content_words(question))}") if query.strip()]


def _best_sentence(text: str, question: str, index: HybridIndex) -> tuple[int, list[str], float]:
    sentences = split_sentences(text)
    terms = set(tokenize(question))
    best_i, best_score = 0, -1.0
    for i, sentence in enumerate(sentences):
        score = sum(index.idf.get(term, 1.0) for term in terms & set(tokenize(sentence)))
        if score > best_score:
            best_i, best_score = i, score
    return best_i, sentences, best_score


ANCHOR = re.compile(r"\d[\d,.]*|[A-ZÀ-Ỹ][\w'’-]+")


def _anchors(sentence: str) -> set[str]:
    """Numbers and capitalised names: tokens that survive translation unchanged."""
    return {deaccent(token.lower()).rstrip(".,") for token in ANCHOR.findall(sentence)}


def _align(source: list[str], i: int, target: list[str]) -> int:
    """Index of the target sentence that translates source[i].

    Sentence splitting can differ by one or two between the languages, so pure
    position is not enough. Shared anchors (names, numbers) decide, with
    relative position as the tie-breaker.
    """
    if len(source) == len(target):
        return i
    anchors = _anchors(source[i])
    relative = i / max(1, len(source) - 1)

    def score(j: int) -> float:
        return 2.0 * len(anchors & _anchors(target[j])) - abs(relative - j / max(1, len(target) - 1))

    return max(range(len(target)), key=score)


def _aligned_sentence(hit: Hit, question: str, q_lang: str, locale: str, index: HybridIndex) -> tuple[str, str, float]:
    """Pick the best sentence in the question's language, then show its counterpart in the reader's language.

    XQuAD paragraphs are translated sentence by sentence, so each sentence has a
    counterpart in the other language.
    """
    i, source_sentences, score = _best_sentence(hit.passage.text(q_lang), question, index)
    if locale == q_lang:
        return source_sentences[i], source_sentences[i], score
    target_sentences = split_sentences(hit.passage.text(locale))
    return target_sentences[_align(source_sentences, i, target_sentences)], source_sentences[i], score


def synthesize(
    question: str, q_lang: str, locale: str, accepted: list[Hit], critique_result: Critique, index: HybridIndex, labels: dict[str, str]
) -> Synthesis:
    if not accepted:
        return Synthesis(verdict=labels["not_found_verdict"], answer=labels["not_found"], cited_ids=[], extracted_sentence="")

    top = accepted[0]
    sentence, extracted, top_score = _aligned_sentence(top, question, q_lang, locale, index)

    if not critique_result.answerable:
        answer = f"{labels['not_found']}\n\n{labels['closest']}: {sentence} [{top.passage.id}]"
        return Synthesis(verdict=labels["not_found_verdict"], answer=answer, cited_ids=[top.passage.id], extracted_sentence=extracted)

    parts = [f"{sentence} [{top.passage.id}]"]
    cited = [top.passage.id]
    for hit in accepted[1:]:
        support, _, score = _aligned_sentence(hit, question, q_lang, locale, index)
        if score >= 0.6 * top_score and support != sentence:
            parts.append(f"{labels['supporting']}: {support} [{hit.passage.id}]")
            cited.append(hit.passage.id)
            break

    if critique_result.coverage < COVERAGE_TARGET:
        parts.append(labels["uncertain"])

    # The headline names the source instead of repeating the answer sentence shown right below it.
    verdict = labels["grounded_in"].format(title=top.passage.title)
    return Synthesis(verdict=verdict, answer="\n\n".join(parts), cited_ids=cited, extracted_sentence=extracted)
