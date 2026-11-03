"""Download XQuAD (English + Vietnamese) and convert it into AtlasTrace's corpus format.

XQuAD (Artetxe et al., 2019) is 240 Wikipedia paragraphs from SQuAD v1.1 with
1,190 question/answer pairs, professionally translated into 10 languages. The
English and Vietnamese files are paragraph- and question-aligned, which is what
makes a real cross-lingual evaluation possible.

Source:  https://github.com/google-deepmind/xquad
License: CC BY-SA 4.0 (the converted files in data/xquad/ keep that license)

Usage:
    python scripts/fetch_xquad.py            # download + convert
    python scripts/fetch_xquad.py --offline  # convert already-downloaded raw files
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "xquad"
RAW = OUT / "raw"
BASE_URL = "https://raw.githubusercontent.com/google-deepmind/xquad/master/xquad.{lang}.json"
LANGS = ("en", "vi")


def download(lang: str) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    target = RAW / f"xquad.{lang}.json"
    with urllib.request.urlopen(BASE_URL.format(lang=lang), timeout=60) as response:
        target.write_bytes(response.read())
    return target


def load(lang: str) -> list[dict]:
    return json.loads((RAW / f"xquad.{lang}.json").read_text(encoding="utf-8"))["data"]


def convert() -> tuple[int, int]:
    data = {lang: load(lang) for lang in LANGS}
    en_articles, vi_articles = data["en"], data["vi"]
    if len(en_articles) != len(vi_articles):
        raise SystemExit("EN and VI files are not aligned at article level")

    passages: list[dict] = []
    questions: list[dict] = []
    counter = 0

    for en_article, vi_article in zip(en_articles, vi_articles, strict=True):
        title = en_article["title"].replace("_", " ")
        for en_par, vi_par in zip(en_article["paragraphs"], vi_article["paragraphs"], strict=True):
            counter += 1
            pid = f"XQ-{counter:03d}"
            passages.append({"id": pid, "title": title, "text_en": en_par["context"], "text_vi": vi_par["context"]})

            vi_by_id = {qa["id"]: qa for qa in vi_par["qas"]}
            for en_qa in en_par["qas"]:
                vi_qa = vi_by_id.get(en_qa["id"])
                if vi_qa is None:
                    continue
                questions.append(
                    {
                        "qid": en_qa["id"],
                        "passage_id": pid,
                        "question_en": en_qa["question"],
                        "question_vi": vi_qa["question"],
                        "answers_en": sorted({a["text"] for a in en_qa["answers"]}),
                        "answers_vi": sorted({a["text"] for a in vi_qa["answers"]}),
                    }
                )

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "passages.jsonl").open("w", encoding="utf-8") as handle:
        for row in passages:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    with (OUT / "questions.jsonl").open("w", encoding="utf-8") as handle:
        for row in questions:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    return len(passages), len(questions)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--offline", action="store_true", help="skip the download and convert data/xquad/raw/")
    args = parser.parse_args()

    if not args.offline:
        for lang in LANGS:
            print(f"downloading xquad.{lang}.json", file=sys.stderr)
            download(lang)

    n_passages, n_questions = convert()
    print(f"wrote {n_passages} passages and {n_questions} questions to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
