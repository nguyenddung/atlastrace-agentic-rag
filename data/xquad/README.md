# XQuAD (English + Vietnamese)

AtlasTrace's knowledge base is built from **XQuAD**, a public cross-lingual question-answering benchmark by Google DeepMind.

- 240 Wikipedia paragraphs from 48 articles (from the SQuAD v1.1 dev set)
- 1,190 question/answer pairs
- Professionally translated into Vietnamese, aligned paragraph-for-paragraph and question-for-question with English

| File | Contents |
| --- | --- |
| `passages.jsonl` | One row per paragraph: `id` (`XQ-001` … `XQ-240`), `title`, `text_en`, `text_vi` |
| `questions.jsonl` | One row per question: `qid`, `passage_id` (gold passage), `question_en`, `question_vi`, `answers_en`, `answers_vi` |

Regenerate with `python scripts/fetch_xquad.py`. The raw downloads go to `raw/`, which git ignores.

## Source and license

- Source: <https://github.com/google-deepmind/xquad>
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/legalcode). The converted files in this folder are a reformatting of XQuAD and are shared under the same license. The paragraphs come from Wikipedia, which is also CC BY-SA.
- Citation: Artetxe, M., Ruder, S., & Yogatama, D. (2019). *On the cross-lingual transferability of monolingual representations.* [arXiv:1910.11856](https://arxiv.org/abs/1910.11856)

This license applies to the data in this folder only. The AtlasTrace code is MIT-licensed.
