"""Offline evaluation of AtlasTrace on all 1,190 labelled XQuAD questions.

Sections of the report
    1. Retrieval    Recall@1/5/10 and MRR@10 of the gold passage, for English
                    questions, Vietnamese questions, and Vietnamese questions
                    against an English-only index (the baseline).
    2. Ablations    The same metrics with BM25 only, vectors only, and without
                    syllable bigrams, to show what each component contributes.
    3. Pipeline     End-to-end Demo runs: gold passage cited first, gold answer
                    in the extracted sentence, corrective-loop and not-found
                    rates, latency.
    4. Corrective   What the critic's second retrieval changed, on the
       loop         questions where it ran.
    5. By intent    Pipeline accuracy per question type (who / when / how many…).
    6. Failures     A few misses, for error analysis.

Usage:
    python scripts/evaluate.py                 # print the report
    python scripts/evaluate.py --write         # also write eval/report.json, eval/REPORT.md and eval/*.svg
    python scripts/evaluate.py --limit 200     # quick run on the first 200 questions
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from atlastrace.agents.deterministic import classify_intent  # noqa: E402
from atlastrace.corpus import load_passages, load_questions, passages_by_id  # noqa: E402
from atlastrace.graph import run_state  # noqa: E402
from atlastrace.retrieval import HybridIndex, get_index  # noqa: E402
from atlastrace.text import deaccent, words  # noqa: E402

KS = list(range(1, 11))
DEV_LAST_PASSAGE = 120  # XQ-001..XQ-120 = the first 24 articles; used only to choose fusion weights
SWEEP_WEIGHTS = [0.0, 0.1, 0.25, 0.5, 1.0]
INTENTS = ["person", "time", "quantity", "place", "reason", "fact"]


def contains(text: str, answers: tuple[str, ...]) -> bool:
    folded = deaccent(text.lower())
    return any(deaccent(answer.lower()) in folded for answer in answers)


# --------------------------------------------------------------------------- retrieval


def retrieval_metrics(questions, lang: str, index: HybridIndex, weights: dict[str, float] | None = None) -> dict:
    hits_at = {k: 0 for k in KS}
    mrr = 0.0
    for question in questions:
        ids = [hit.passage.id for hit in index.search([question.question(lang)], limit=10, weights=weights)]
        if question.passage_id in ids:
            rank = ids.index(question.passage_id) + 1
            mrr += 1 / rank
            for k in KS:
                hits_at[k] += rank <= k
    n = len(questions)
    return {"recall@1": hits_at[1] / n, "recall@5": hits_at[5] / n, "recall@10": hits_at[10] / n, "mrr@10": mrr / n, "curve": [hits_at[k] / n for k in KS]}


def unigram_tokenize(value: str) -> list[str]:
    return words(value)


# --------------------------------------------------------------------------- pipeline


def pipeline_metrics(questions, lang: str) -> tuple[dict, list[dict]]:
    rows = []
    for question in questions:
        started = time.perf_counter()
        state = run_state(question.question(lang), locale=lang, mode="demo")
        latency = (time.perf_counter() - started) * 1000
        accepted = state["accepted_ids"]
        first = state.get("first_pass_accepted", accepted)
        rows.append(
            {
                "qid": question.qid,
                "question": question.question(lang),
                "intent": classify_intent(question.question(lang)),
                "gold": question.passage_id,
                "cited_first": accepted[0] if accepted else None,
                "gold_first": bool(accepted) and accepted[0] == question.passage_id,
                "gold_accepted": question.passage_id in accepted,
                "gold_first_before": bool(first) and first[0] == question.passage_id,
                "gold_accepted_before": question.passage_id in first,
                "answer_hit": contains(state["extracted_sentence"], question.answers(lang)),
                "corrective": state["round"] > 1,
                "not_found": not state.get("answerable", True),
                "latency_ms": latency,
            }
        )

    n = len(rows)
    latencies = sorted(row["latency_ms"] for row in rows)
    summary = {
        "gold_passage_cited_first": sum(r["gold_first"] for r in rows) / n,
        "gold_passage_in_ledger": sum(r["gold_accepted"] for r in rows) / n,
        "answer_in_extracted_sentence": sum(r["answer_hit"] for r in rows) / n,
        "corrective_loop_rate": sum(r["corrective"] for r in rows) / n,
        "not_found_rate": sum(r["not_found"] for r in rows) / n,
        "latency_ms_p50": statistics.median(latencies),
        "latency_ms_p95": latencies[int(0.95 * (n - 1))],
    }
    return summary, rows


def corrective_effect(rows: list[dict]) -> dict:
    looped = [r for r in rows if r["corrective"]]
    if not looped:
        return {"n": 0}
    n = len(looped)
    return {
        "n": n,
        "gold_in_ledger_before": sum(r["gold_accepted_before"] for r in looped) / n,
        "gold_in_ledger_after": sum(r["gold_accepted"] for r in looped) / n,
        "gold_first_before": sum(r["gold_first_before"] for r in looped) / n,
        "gold_first_after": sum(r["gold_first"] for r in looped) / n,
    }


def by_intent(rows: list[dict]) -> dict:
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        groups[row["intent"]].append(row)
    return {
        intent: {
            "n": len(group),
            "gold_first": sum(r["gold_first"] for r in group) / len(group),
            "answer_hit": sum(r["answer_hit"] for r in group) / len(group),
        }
        for intent, group in groups.items()
    }


def failures(rows: list[dict], limit: int = 4) -> list[dict]:
    titles = {p.id: p.title for p in load_passages()}
    misses = [r for r in rows if not r["gold_first"] and r["cited_first"]]
    step = max(1, len(misses) // limit)
    return [
        {
            "question": r["question"],
            "gold": f"{r['gold']} ({titles[r['gold']]})",
            "cited": f"{r['cited_first']} ({titles[r['cited_first']]})",
            "gold_in_ledger": r["gold_accepted"],
        }
        for r in misses[::step][:limit]
    ]


# --------------------------------------------------------------------------- charts (dependency-free SVG)

FONT = "font-family='ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif'"
COLORS = {"en": "#1a7f5a", "vi": "#2563eb", "vi_en_only": "#d97706", "muted": "#6b7280", "grid": "#e5e7eb", "ink": "#12211d"}


def recall_curve_svg(report: dict) -> str:
    width, height, left, right, top, bottom = 720, 360, 56, 24, 48, 48
    plot_w, plot_h = width - left - right, height - top - bottom
    x = lambda k: left + (k - 1) / (len(KS) - 1) * plot_w  # noqa: E731
    y = lambda v: top + (1 - v) * plot_h  # noqa: E731
    parts = [
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {width} {height}' width='{width}' height='{height}' {FONT}>",
        f"<rect width='{width}' height='{height}' rx='14' fill='#ffffff' stroke='{COLORS['grid']}'/>",
        f"<text x='{left}' y='28' font-size='15' font-weight='600' fill='{COLORS['ink']}'>Recall@k of the gold passage (1,190 questions)</text>",
    ]
    for tick in (0, 0.25, 0.5, 0.75, 1.0):
        parts.append(f"<line x1='{left}' x2='{width - right}' y1='{y(tick):.1f}' y2='{y(tick):.1f}' stroke='{COLORS['grid']}'/>")
        parts.append(f"<text x='{left - 8}' y='{y(tick) + 4:.1f}' font-size='11' text-anchor='end' fill='{COLORS['muted']}'>{int(tick * 100)}%</text>")
    for k in KS:
        parts.append(f"<text x='{x(k):.1f}' y='{height - bottom + 18}' font-size='11' text-anchor='middle' fill='{COLORS['muted']}'>{k}</text>")
    parts.append(f"<text x='{left + plot_w / 2}' y='{height - 10}' font-size='11' text-anchor='middle' fill='{COLORS['muted']}'>k (passages returned)</text>")
    series = [("en", "EN question → bilingual index"), ("vi", "VI question → bilingual index"), ("vi_en_only", "VI question → English-only index")]
    for i, (key, label) in enumerate(series):
        curve = report["retrieval"][key]["curve"]
        points = " ".join(f"{x(k):.1f},{y(v):.1f}" for k, v in zip(KS, curve, strict=True))
        dash = " stroke-dasharray='6 5'" if key == "vi_en_only" else ""
        parts.append(f"<polyline points='{points}' fill='none' stroke='{COLORS[key]}' stroke-width='2.5'{dash}/>")
        for k, v in zip(KS, curve, strict=True):
            parts.append(f"<circle cx='{x(k):.1f}' cy='{y(v):.1f}' r='3' fill='{COLORS[key]}'/>")
        lx, ly = width - right - 250, top + plot_h - 70 + i * 20
        parts.append(f"<line x1='{lx}' x2='{lx + 22}' y1='{ly}' y2='{ly}' stroke='{COLORS[key]}' stroke-width='3'{dash}/>")
        parts.append(f"<text x='{lx + 30}' y='{ly + 4}' font-size='12' fill='{COLORS['ink']}'>{label}</text>")
    parts.append("</svg>")
    return "\n".join(parts)


def ablation_svg(report: dict) -> str:
    rows = [
        ("BM25 (default)", "default"),
        ("BM25 + vectors, equal", "equal_hybrid"),
        ("Vectors only", "vector_only"),
        ("BM25, no bigrams", "no_bigrams"),
    ]
    width, row_h, left, top = 720, 46, 200, 64
    height = top + row_h * len(rows) + 40
    bar_w = width - left - 80
    parts = [
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {width} {height}' width='{width}' height='{height}' {FONT}>",
        f"<rect width='{width}' height='{height}' rx='14' fill='#ffffff' stroke='{COLORS['grid']}'/>",
        f"<text x='24' y='28' font-size='15' font-weight='600' fill='{COLORS['ink']}'>Ablation: Recall@1 by retrieval variant (all 1,190 questions)</text>",
        f"<rect x='{left}' y='40' width='12' height='12' rx='2' fill='{COLORS['en']}'/><text x='{left + 18}' y='50' font-size='12' fill='{COLORS['ink']}'>English questions</text>",
        f"<rect x='{left + 150}' y='40' width='12' height='12' rx='2' fill='{COLORS['vi']}'/><text x='{left + 168}' y='50' font-size='12' fill='{COLORS['ink']}'>Vietnamese questions</text>",
    ]
    for i, (label, key) in enumerate(rows):
        y0 = top + i * row_h
        parts.append(f"<text x='{left - 12}' y='{y0 + 22}' font-size='12' text-anchor='end' fill='{COLORS['ink']}'>{label}</text>")
        for j, lang in enumerate(("en", "vi")):
            value = report["ablations"][key][lang]["recall@1"]
            yy = y0 + 4 + j * 18
            parts.append(f"<rect x='{left}' y='{yy}' width='{bar_w:.0f}' height='14' rx='3' fill='{COLORS['grid']}'/>")
            parts.append(f"<rect x='{left}' y='{yy}' width='{bar_w * value:.1f}' height='14' rx='3' fill='{COLORS[lang]}'/>")
            parts.append(f"<text x='{left + bar_w + 8}' y='{yy + 11}' font-size='11' fill='{COLORS['ink']}'>{value * 100:.1f}%</text>")
    parts.append("</svg>")
    return "\n".join(parts)


# --------------------------------------------------------------------------- report


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def to_markdown(report: dict) -> str:
    r, a, p = report["retrieval"], report["ablations"], report["pipeline"]
    out = [
        "# AtlasTrace evaluation report",
        "",
        f"Dataset: XQuAD (EN + VI), {report['n_questions']:,} labelled questions over {report['n_passages']} passages. "
        "Generated by `python scripts/evaluate.py --write`; every number below is reproducible because the Demo pipeline is deterministic.",
        "",
        "## 1. Retrieval",
        "",
        "| Setting | Recall@1 | Recall@5 | Recall@10 | MRR@10 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for key, label in (
        ("en", "English question → bilingual index"),
        ("vi", "Vietnamese question → bilingual index"),
        ("vi_en_only", "Vietnamese question → English-only index (baseline)"),
    ):
        m = r[key]
        out.append(f"| {label} | {pct(m['recall@1'])} | {pct(m['recall@5'])} | {pct(m['recall@10'])} | {m['mrr@10']:.3f} |")
    out += [
        "",
        "![Recall@k](recall_at_k.svg)",
        "",
        "## 2. Ablations",
        "",
        "| Variant | EN Recall@1 | EN MRR@10 | VI Recall@1 | VI MRR@10 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for key, label in (
        ("default", "BM25 with RRF over queries (default, vector weight 0)"),
        ("equal_hybrid", "BM25 + hashed vectors, equal RRF weight"),
        ("vector_only", "Hashed vectors only"),
        ("no_bigrams", "Default without syllable bigrams"),
    ):
        en, vi = a[key]["en"], a[key]["vi"]
        out.append(f"| {label} | {pct(en['recall@1'])} | {en['mrr@10']:.3f} | {pct(vi['recall@1'])} | {vi['mrr@10']:.3f} |")
    fs = report["fusion_sweep"]
    out += [
        "",
        "![Ablation](ablation.svg)",
        "",
        f"### Choosing the fusion weight (dev split: first 24 articles, {fs['dev_questions']} questions)",
        "",
        "| Vector weight in RRF | EN Recall@1 | VI Recall@1 |",
        "| --- | --- | --- |",
    ]
    for row in fs["dev"]:
        out.append(f"| {row['vector_weight']} | {pct(row['en'])} | {pct(row['vi'])} |")
    t = fs["test_recall@1"]
    out += [
        "",
        f"On the held-out half (last 24 articles, {fs['test_questions']} questions) the chosen weight 0 gives "
        f"Recall@1 {pct(t['default']['en'])} EN / {pct(t['default']['vi'])} VI, versus {pct(t['equal_hybrid']['en'])} / {pct(t['equal_hybrid']['vi'])} with equal weights.",
        "",
        "The hashed vectors are a bag of hashed terms, so they carry no information BM25 lacks and add hash collisions. XQuAD questions also share many words with their passage. "
        "Learned multilingual embeddings are the component that would earn a non-zero weight; the interface is ready for them.",
        "",
        "## 3. End-to-end pipeline (Demo mode)",
        "",
    ]
    out += [
        "| Language | Gold passage cited first | Gold passage in ledger | Answer in extracted sentence | Corrective loop | Flagged not found | p50 | p95 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for lang, label in (("en", "English"), ("vi", "Vietnamese")):
        m = p[lang]
        out.append(
            f"| {label} | {pct(m['gold_passage_cited_first'])} | {pct(m['gold_passage_in_ledger'])} | {pct(m['answer_in_extracted_sentence'])} | "
            f"{pct(m['corrective_loop_rate'])} | {pct(m['not_found_rate'])} | {m['latency_ms_p50']:.1f} ms | {m['latency_ms_p95']:.1f} ms |"
        )
    out += ["", "## 4. What the corrective loop changed", "", "Measured only on the questions where the critic asked for a second retrieval.", ""]
    out += ["| Language | Questions | Gold in ledger: before → after | Gold cited first: before → after |", "| --- | --- | --- | --- |"]
    for lang, label in (("en", "English"), ("vi", "Vietnamese")):
        c = report["corrective"][lang]
        if c["n"]:
            out.append(
                f"| {label} | {c['n']} | {pct(c['gold_in_ledger_before'])} → {pct(c['gold_in_ledger_after'])} | {pct(c['gold_first_before'])} → {pct(c['gold_first_after'])} |"
            )
    unchanged = all(
        c["gold_in_ledger_after"] == c["gold_in_ledger_before"] and c["gold_first_after"] == c["gold_first_before"]
        for c in report["corrective"].values()
        if c["n"]
    )
    if unchanged:
        out += [
            "",
            "On XQuAD the second retrieval never changes which passage is cited: when the gold passage is retrieved at all, it is already in the first six. "
            "Low term coverage here mostly reflects paraphrase, not missing evidence. "
            "The loop is kept because it costs a few milliseconds and matters on corpora where evidence is spread across documents, and in Live mode, where the model critic decides what is missing.",
        ]
    out += [
        "",
        "## 5. By question type",
        "",
        "| Intent | EN n | EN cited first | EN answer hit | VI n | VI cited first | VI answer hit |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for intent in INTENTS:
        en, vi = report["by_intent"]["en"].get(intent), report["by_intent"]["vi"].get(intent)
        cells = []
        for m in (en, vi):
            cells += [str(m["n"]), pct(m["gold_first"]), pct(m["answer_hit"])] if m else ["0", "–", "–"]
        out.append(f"| {intent} | " + " | ".join(cells) + " |")
    out += [
        "",
        "Intent is detected from the question words in each language, so EN and VI counts differ slightly.",
        "",
        "## 6. Error analysis",
        "",
        "Sampled misses where another passage was cited first (Vietnamese questions):",
        "",
        "| Question | Gold passage | Cited first | Gold still in ledger |",
        "| --- | --- | --- | --- |",
    ]
    for f in report["failures"]["vi"]:
        out.append(f"| {f['question']} | {f['gold']} | {f['cited']} | {'yes' if f['gold_in_ledger'] else 'no'} |")
    out += [
        "",
        "Most misses are neighbouring paragraphs of the same article, where the question's terms appear in several passages. "
        "That is a ranking problem a cross-encoder reranker or multilingual embeddings would address.",
        "",
        "## Metric definitions",
        "",
        "- **Recall@k**: the gold passage is among the top k results of the index for the raw question.",
        "- **MRR@10**: mean of 1/rank of the gold passage, 0 if it is not in the top 10.",
        "- **Gold passage cited first**: the full pipeline (plan → retrieve → critique → synthesize) puts the gold passage first in the evidence ledger.",
        "- **Answer in extracted sentence**: the gold answer span appears in the sentence the deterministic synthesizer picked. Sentence-level, not exact-match span extraction.",
        "- **Corrective loop**: the critic measured under 75% term coverage and triggered a second retrieval.",
        "- **Flagged not found**: the critic judged no passage to cover enough of the question to answer it. On XQuAD every question is answerable, so this is a false-negative rate.",
    ]
    return "\n".join(out) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    questions = load_questions()[: args.limit] if args.limit else load_questions()
    bilingual = get_index(("en", "vi"))
    no_bigrams = HybridIndex(passages_by_id().values(), tokenizer=unigram_tokenize)

    retrieval = {
        "en": retrieval_metrics(questions, "en", bilingual),
        "vi": retrieval_metrics(questions, "vi", bilingual),
        "vi_en_only": retrieval_metrics(questions, "vi", get_index(("en",))),
    }
    ablations = {
        "default": {lang: retrieval[lang] for lang in ("en", "vi")},
        "equal_hybrid": {lang: retrieval_metrics(questions, lang, bilingual, weights={"bm25": 1.0, "vector": 1.0}) for lang in ("en", "vi")},
        "vector_only": {lang: retrieval_metrics(questions, lang, bilingual, weights={"bm25": 0.0, "vector": 1.0}) for lang in ("en", "vi")},
        "no_bigrams": {lang: retrieval_metrics(questions, lang, no_bigrams) for lang in ("en", "vi")},
    }
    dev = [q for q in questions if int(q.passage_id[3:]) <= DEV_LAST_PASSAGE]
    test = [q for q in questions if int(q.passage_id[3:]) > DEV_LAST_PASSAGE]
    sweep = []
    for weight in SWEEP_WEIGHTS:
        w = {"bm25": 1.0, "vector": weight}
        sweep.append({"vector_weight": weight, **{lang: retrieval_metrics(dev, lang, bilingual, w)["recall@1"] for lang in ("en", "vi")}})
    held_out = {
        name: {lang: retrieval_metrics(test, lang, bilingual, w)["recall@1"] for lang in ("en", "vi")}
        for name, w in (("default", None), ("equal_hybrid", {"bm25": 1.0, "vector": 1.0}))
    }

    pipeline, rows = {}, {}
    for lang in ("en", "vi"):
        pipeline[lang], rows[lang] = pipeline_metrics(questions, lang)

    report = {
        "n_questions": len(questions),
        "n_passages": len(bilingual.docs) // 2,
        "retrieval": retrieval,
        "ablations": ablations,
        "fusion_sweep": {"dev_questions": len(dev), "test_questions": len(test), "dev": sweep, "test_recall@1": held_out},
        "pipeline": pipeline,
        "corrective": {lang: corrective_effect(rows[lang]) for lang in ("en", "vi")},
        "by_intent": {lang: by_intent(rows[lang]) for lang in ("en", "vi")},
        "failures": {lang: failures(rows[lang]) for lang in ("en", "vi")},
    }
    markdown = to_markdown(report)
    print(markdown)

    if args.write:
        out = ROOT / "eval"
        out.mkdir(exist_ok=True)
        (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        (out / "REPORT.md").write_text(markdown, encoding="utf-8")
        (out / "recall_at_k.svg").write_text(recall_curve_svg(report) + "\n", encoding="utf-8")
        (out / "ablation.svg").write_text(ablation_svg(report) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
