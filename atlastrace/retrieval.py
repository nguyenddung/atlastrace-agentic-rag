"""Hybrid retrieval: BM25 + hashed TF-IDF vectors, fused with reciprocal rank fusion.

Every passage is indexed twice, once per language. A Vietnamese question matches
the Vietnamese text and an English question the English text, and the two hits
collapse back onto one passage id. That is the whole cross-lingual trick: no
translation at query time, because the corpus is already parallel.

The index is built once per process (it takes well under a second for 480
documents) and reused by every request.
"""

from __future__ import annotations

import math
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache

from .corpus import Passage, load_passages
from .text import tokenize

RRF_K = 60
VECTOR_DIMS = 2048


@dataclass(frozen=True)
class Hit:
    passage: Passage
    lang: str  # language of the text that matched best
    bm25: float
    vector: float
    fused: float  # RRF score normalised to 0..1 within the result list
    matched_terms: tuple[str, ...]


def _hash(feature: str) -> int:
    value = 2166136261
    for char in feature.encode("utf-8"):
        value = ((value ^ char) * 16777619) & 0xFFFFFFFF
    return value % VECTOR_DIMS


class HybridIndex:
    def __init__(self, passages: Iterable[Passage], langs: tuple[str, ...] = ("en", "vi"), k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.docs: list[tuple[Passage, str, Counter[str]]] = []
        for passage in passages:
            for lang in langs:
                self.docs.append((passage, lang, Counter(tokenize(f"{passage.title} {passage.text(lang)}"))))

        self.n_docs = len(self.docs)
        lengths = [sum(counts.values()) for _, _, counts in self.docs]
        self.lengths = lengths
        self.avg_len = sum(lengths) / max(1, self.n_docs)
        df: Counter[str] = Counter()
        for _, _, counts in self.docs:
            df.update(counts.keys())
        self.idf = {term: math.log(1 + (self.n_docs - freq + 0.5) / (freq + 0.5)) for term, freq in df.items()}
        self.vectors = [self._vectorize(counts) for _, _, counts in self.docs]

    def _vectorize(self, counts: Counter[str]) -> dict[int, float]:
        vector: dict[int, float] = {}
        for term, tf in counts.items():
            weight = (1 + math.log(tf)) * self.idf.get(term, math.log(1 + self.n_docs))
            slot = _hash(term)
            vector[slot] = vector.get(slot, 0.0) + weight
        norm = math.sqrt(sum(value * value for value in vector.values())) or 1.0
        return {slot: value / norm for slot, value in vector.items()}

    def _bm25(self, query: list[str], index: int) -> float:
        counts, length = self.docs[index][2], self.lengths[index]
        score = 0.0
        for term in query:
            tf = counts.get(term, 0)
            if tf:
                denominator = tf + self.k1 * (1 - self.b + self.b * length / self.avg_len)
                score += self.idf[term] * tf * (self.k1 + 1) / denominator
        return score

    def search(self, queries: list[str], limit: int = 6, exclude: Iterable[str] = ()) -> list[Hit]:
        """Fuse every (query x scorer) ranking with RRF, then collapse languages onto passage ids."""
        excluded = set(exclude)
        rrf: dict[int, float] = {}
        bm25_best: dict[int, float] = {}
        vector_best: dict[int, float] = {}
        query_terms: set[str] = set()

        for query in queries:
            terms = tokenize(query)
            if not terms:
                continue
            query_terms.update(terms)
            query_vector = self._vectorize(Counter(terms))
            bm25 = [self._bm25(terms, i) for i in range(self.n_docs)]
            vector = [sum(weight * self.vectors[i].get(slot, 0.0) for slot, weight in query_vector.items()) for i in range(self.n_docs)]
            for scores, best in ((bm25, bm25_best), (vector, vector_best)):
                ranked = sorted((i for i in range(self.n_docs) if scores[i] > 0), key=lambda i: scores[i], reverse=True)
                for rank, i in enumerate(ranked):
                    rrf[i] = rrf.get(i, 0.0) + 1 / (RRF_K + rank + 1)
                    best[i] = max(best.get(i, 0.0), scores[i])

        by_passage: dict[str, int] = {}
        for i, score in rrf.items():
            pid = self.docs[i][0].id
            if pid in excluded:
                continue
            if pid not in by_passage or score > rrf[by_passage[pid]]:
                by_passage[pid] = i

        ranked = sorted(by_passage.values(), key=lambda i: rrf[i], reverse=True)[:limit]
        top = rrf[ranked[0]] if ranked else 1.0
        hits = []
        for i in ranked:
            passage, lang, counts = self.docs[i]
            matched = tuple(sorted((term for term in query_terms if term in counts and "_" not in term), key=lambda t: -self.idf[t])[:5])
            hits.append(Hit(passage, lang, round(bm25_best.get(i, 0.0), 4), round(vector_best.get(i, 0.0), 4), round(rrf[i] / top, 4), matched))
        return hits


@lru_cache(maxsize=4)
def get_index(langs: tuple[str, ...] = ("en", "vi")) -> HybridIndex:
    return HybridIndex(load_passages(), langs=langs)
