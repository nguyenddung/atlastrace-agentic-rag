"""Server-side strings for agent traces and answers, so a run stays in one language end to end."""

from __future__ import annotations

MESSAGES: dict[str, dict[str, str]] = {
    "en": {
        "source": "Wikipedia · XQuAD",
        "orchestrator": "Detected a {q_lang_name} question asking for {intent}; routed it to the research team.",
        "planner": "Planned {n_queries} retrieval paths: the full question, its key terms and its named entities.",
        "retriever": "Fused BM25 and vector ranks over {n_docs} passages in English and Vietnamese; kept the top {n_hits}.",
        "retriever_corrective": "Corrective pass for missing terms ({missing}); added {n_new} new passage(s).",
        "critic_ok": "Accepted {n_accepted} passage(s) covering {coverage}% of the question terms.",
        "critic_gap": "Only {coverage}% of the question terms are covered; missing: {missing}. Requested a corrective retrieval.",
        "critic_after": "Re-graded the merged evidence: {n_accepted} passage(s) accepted, {coverage}% term coverage.",
        "synth": "Extracted the best-matching sentence and grounded it in {n_cited} cited passage(s).",
        "synth_live": "Generated a grounded answer with {n_cited} valid citation(s){removed}.",
        "removed": "; dropped {n} citation(s) that pointed outside the ledger",
        "supporting": "Supporting context",
        "grounded_in": "Answered from the “{title}” article",
        "uncertain": "Confidence is limited: part of the question is not covered by the retrieved passages, so check the cited source before relying on this answer.",
        "not_found_verdict": "The knowledge base has no clear answer to this question.",
        "not_found": "None of the retrieved passages covers enough of this question to answer it. The knowledge base is 240 Wikipedia paragraphs from XQuAD, so try a question about one of its 48 topics.",
        "closest": "Closest passage",
        "lang_en": "English",
        "lang_vi": "Vietnamese",
        "intent_person": "a person or group",
        "intent_time": "a date or time",
        "intent_quantity": "a number or amount",
        "intent_place": "a place",
        "intent_reason": "a reason or explanation",
        "intent_fact": "a fact",
        "no_gateway": "No AI Gateway credential is configured on this deployment.",
    },
    "vi": {
        "source": "Wikipedia · XQuAD",
        "orchestrator": "Nhận diện câu hỏi {q_lang_name} cần tìm {intent}; chuyển cho nhóm agent nghiên cứu.",
        "planner": "Lập {n_queries} hướng truy hồi: nguyên câu hỏi, các từ khóa chính và các thực thể được nêu tên.",
        "retriever": "Trộn thứ hạng BM25 và vector trên {n_docs} đoạn văn tiếng Anh và tiếng Việt; giữ {n_hits} đoạn đầu.",
        "retriever_corrective": "Lượt truy hồi bổ sung cho các từ còn thiếu ({missing}); thêm {n_new} đoạn văn mới.",
        "critic_ok": "Chấp nhận {n_accepted} đoạn văn, bao phủ {coverage}% từ khóa của câu hỏi.",
        "critic_gap": "Mới bao phủ {coverage}% từ khóa của câu hỏi; còn thiếu: {missing}. Yêu cầu một lượt truy hồi bổ sung.",
        "critic_after": "Chấm lại bằng chứng sau khi gộp: chấp nhận {n_accepted} đoạn văn, bao phủ {coverage}% từ khóa.",
        "synth": "Trích câu khớp nhất và đặt câu trả lời trên nền {n_cited} đoạn văn có dẫn nguồn.",
        "synth_live": "Sinh câu trả lời có căn cứ với {n_cited} trích dẫn hợp lệ{removed}.",
        "removed": "; loại {n} trích dẫn trỏ ra ngoài danh sách bằng chứng",
        "supporting": "Bối cảnh bổ sung",
        "grounded_in": "Trả lời từ bài viết “{title}”",
        "uncertain": "Độ tin cậy còn hạn chế: một phần câu hỏi chưa được các đoạn văn truy hồi bao phủ, hãy kiểm tra nguồn được dẫn trước khi dựa vào câu trả lời này.",
        "not_found_verdict": "Kho tri thức chưa có câu trả lời rõ ràng cho câu hỏi này.",
        "not_found": "Không đoạn văn nào được truy hồi bao phủ đủ câu hỏi để trả lời. Kho tri thức gồm 240 đoạn Wikipedia của XQuAD, hãy thử hỏi về một trong 48 chủ đề của nó.",
        "closest": "Đoạn gần nhất",
        "lang_en": "tiếng Anh",
        "lang_vi": "tiếng Việt",
        "intent_person": "một người hoặc tổ chức",
        "intent_time": "một mốc thời gian",
        "intent_quantity": "một con số hoặc số lượng",
        "intent_place": "một địa điểm",
        "intent_reason": "một lý do hoặc lời giải thích",
        "intent_fact": "một dữ kiện",
        "no_gateway": "Bản triển khai này chưa cấu hình thông tin xác thực AI Gateway.",
    },
}


def t(locale: str, key: str, **values: object) -> str:
    template = MESSAGES.get(locale, MESSAGES["en"])[key]
    return template.format(**values) if values else template
