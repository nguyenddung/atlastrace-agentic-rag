"""Loads the XQuAD knowledge base and its labelled questions."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "xquad"


@dataclass(frozen=True)
class Passage:
    id: str
    title: str
    text_en: str
    text_vi: str

    def text(self, lang: str) -> str:
        return self.text_vi if lang == "vi" else self.text_en


@dataclass(frozen=True)
class LabelledQuestion:
    qid: str
    passage_id: str
    question_en: str
    question_vi: str
    answers_en: tuple[str, ...]
    answers_vi: tuple[str, ...]

    def question(self, lang: str) -> str:
        return self.question_vi if lang == "vi" else self.question_en

    def answers(self, lang: str) -> tuple[str, ...]:
        return self.answers_vi if lang == "vi" else self.answers_en


def _read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


@lru_cache(maxsize=1)
def load_passages() -> tuple[Passage, ...]:
    return tuple(Passage(**row) for row in _read_jsonl(DATA_DIR / "passages.jsonl"))


@lru_cache(maxsize=1)
def passages_by_id() -> dict[str, Passage]:
    return {passage.id: passage for passage in load_passages()}


@lru_cache(maxsize=1)
def load_questions() -> tuple[LabelledQuestion, ...]:
    rows = _read_jsonl(DATA_DIR / "questions.jsonl")
    return tuple(
        LabelledQuestion(
            qid=row["qid"],
            passage_id=row["passage_id"],
            question_en=row["question_en"],
            question_vi=row["question_vi"],
            answers_en=tuple(row["answers_en"]),
            answers_vi=tuple(row["answers_vi"]),
        )
        for row in rows
    )
