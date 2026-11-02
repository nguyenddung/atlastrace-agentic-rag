import samples from "@/lib/samples.json";
import type { AgentName } from "@/lib/types";
import type { Locale } from "./locale";

const en = {
  localeName: "English",
  localeShort: "EN",
  switchLanguage: "Switch language",

  brandTagline: "Evidence-first RAG",
  navDecisionRoom: "Research room",
  navArchitecture: "Architecture",
  navSource: "Source",
  systemReady: "System ready",

  painEyebrow: "THE PROBLEM",
  heroTitleLead: "A fluent answer is not the same as",
  heroTitleEmphasis: "a grounded one.",
  heroCopy:
    "Single-pass RAG returns something plausible and rarely checks what it missed — and it quietly gets worse when the question is in Vietnamese and the sources are in English. AtlasTrace plans, retrieves in both languages, lets a critic reject weak coverage, and only then answers, with every claim tied to a source.",

  briefLabel: "Knowledge base / XQuAD",
  briefStatus: "PUBLIC DATA",
  briefQuestion: "240 Wikipedia passages, professionally translated into Vietnamese, with 1,190 labelled questions.",
  briefPassages: "Passages · articles",
  briefQuestions: "Labelled questions",
  briefRecall: "Recall@5 · EN / VI",
  briefBaseline: "VI → English-only index",
  briefFooter: "Measured by scripts/evaluate.py on every labelled question",

  solutionStrip: "AtlasTrace turns a question into an auditable evidence trail.",
  stepPlan: "Plan",
  stepRetrieve: "Retrieve",
  stepCritique: "Critique",
  stepSynthesize: "Synthesize",

  workspaceEyebrow: "LIVE RESEARCH ROOM",
  workspaceTitle: "Inspect the reasoning, not just the answer.",
  workspaceCopy:
    "Ask about any of the 48 Wikipedia topics in XQuAD (Super Bowl 50, Nikola Tesla, Oxygen, Genghis Khan, the Amazon rainforest…) in English or Vietnamese. Every answer shows the retrieval plan, each agent's measured handoff and the passage behind every claim.",

  queryLabel: "RESEARCH QUESTION",
  queryAria: "Research question",
  runResearch: "Run research",
  runningAgents: "Running agents",
  modeGroup: "Research mode",
  modeDemo: "Demo",
  modeLive: "Live AI",

  fallbackTitle: "Live AI fallback",
  fallbackBody: "The deterministic pipeline completed this run because the model gateway was unavailable.",
  errorGeneric: "Research run failed",
  errorLength: "Ask a specific question between 12 and 500 characters.",
  errorRateLimited: "Too many requests. Wait a moment before running another query.",

  agentActivity: "Agent activity",
  handoffs: "handoffs",
  statusRevised: "Corrective pass",
  statusComplete: "Complete",
  retrievalPlan: "Retrieval plan",

  groundedRecommendation: "Grounded answer",
  sourceLive: "Live model · AI Gateway",
  sourceDemo: "Deterministic demo · zero API keys",
  confidenceAria: "grounded confidence",
  confidenceLabel: "grounded",
  recommendation: "ANSWER",

  metricCoverage: "Term coverage",
  metricEvidence: "Evidence accepted",
  metricRounds: "Critique rounds",
  metricTime: "Pipeline time",

  evidenceLedger: "Evidence ledger",
  evidenceGrounded: "accepted",
  selectedPassage: "Selected passage",
  viewSource: "View source",
  stanceSupport: "cited",
  stanceContext: "context",

  archEyebrow: "WHY THIS IS AGENTIC RAG",
  archTitle: "A corrective loop—not a prompt wrapped around vector search.",
  archCopy:
    "A LangGraph state machine in Python. The critic measures how much of the question the evidence covers; when coverage is short it triggers a targeted second retrieval, then re-grades the merged evidence before the synthesizer may answer. Citations outside the ledger are stripped.",
  archAria: "Agentic RAG architecture",
  archOrchestrator: "Orchestrator",
  archOrchestratorCopy: "Detects language + intent",
  archPlanner: "Planner agent",
  archPlannerCopy: "Question, key terms, entities",
  archRetrieval: "Hybrid retrieval",
  archRetrievalCopy: "BM25 + vectors + RRF, EN + VI",
  archCritic: "Critic agent",
  archCriticCopy: "Measures coverage, finds gaps",
  archSynthesizer: "Synthesizer",
  archSynthesizerCopy: "Answers with audited citations",

  techRetrievalTag: "RETRIEVAL",
  techRetrievalTitle: "Bilingual by index, not by translation",
  techRetrievalCopy:
    "Every passage is indexed in English and Vietnamese, and both hits collapse onto one passage id. A Vietnamese question matches Vietnamese text directly — Recall@5 goes from under 50% against an English-only index to 97%.",
  techReliabilityTag: "RELIABILITY",
  techReliabilityTitle: "Graceful degradation",
  techReliabilityCopy:
    "Live agents run through Vercel AI Gateway with Pydantic-validated outputs. Any gateway or schema failure falls back to the deterministic pipeline, so the demo works without secrets or quota.",
  techEvaluationTag: "EVALUATION",
  techEvaluationTitle: "Measured on 1,190 labelled questions",
  techEvaluationCopy:
    "scripts/evaluate.py reports Recall@k, MRR, gold-passage citation rate, answer accuracy, corrective-loop rate and latency for both languages. The numbers on this page come from that report.",

  footerCopy: "Built as an evidence-first AI engineering portfolio project. Data: XQuAD (CC BY-SA 4.0).",
  footerStack: "Python · FastAPI · LangGraph · Next.js",

  sampleQuestions: samples.en,

  agentNames: {
    Orchestrator: "Orchestrator",
    "Query Planner": "Query Planner",
    "Hybrid Retriever": "Hybrid Retriever",
    "Evidence Critic": "Evidence Critic",
    "Answer Synthesizer": "Answer Synthesizer",
  } as Record<AgentName, string>,
};

export type Dictionary = typeof en;

const vi: Dictionary = {
  localeName: "Tiếng Việt",
  localeShort: "VI",
  switchLanguage: "Đổi ngôn ngữ",

  brandTagline: "RAG đặt bằng chứng lên đầu",
  navDecisionRoom: "Phòng nghiên cứu",
  navArchitecture: "Kiến trúc",
  navSource: "Mã nguồn",
  systemReady: "Hệ thống sẵn sàng",

  painEyebrow: "VẤN ĐỀ",
  heroTitleLead: "Một câu trả lời trôi chảy chưa chắc là",
  heroTitleEmphasis: "một câu trả lời có căn cứ.",
  heroCopy:
    "RAG một lượt trả về điều nghe hợp lý và hiếm khi kiểm tra mình đã bỏ sót gì — chất lượng còn giảm âm thầm khi câu hỏi bằng tiếng Việt mà nguồn bằng tiếng Anh. AtlasTrace lập kế hoạch, truy hồi ở cả hai ngôn ngữ, để tác tử phản biện bác bỏ độ phủ yếu, rồi mới trả lời, với mọi luận điểm gắn với một nguồn.",

  briefLabel: "Kho tri thức / XQuAD",
  briefStatus: "DỮ LIỆU CÔNG KHAI",
  briefQuestion: "240 đoạn Wikipedia được dịch chuyên nghiệp sang tiếng Việt, kèm 1.190 câu hỏi có gán nhãn.",
  briefPassages: "Đoạn văn · bài viết",
  briefQuestions: "Câu hỏi có nhãn",
  briefRecall: "Recall@5 · EN / VI",
  briefBaseline: "VI → chỉ mục chỉ tiếng Anh",
  briefFooter: "Đo bằng scripts/evaluate.py trên toàn bộ câu hỏi có nhãn",

  solutionStrip: "AtlasTrace biến một câu hỏi thành dấu vết bằng chứng kiểm tra được.",
  stepPlan: "Lập kế hoạch",
  stepRetrieve: "Truy hồi",
  stepCritique: "Phản biện",
  stepSynthesize: "Tổng hợp",

  workspaceEyebrow: "PHÒNG NGHIÊN CỨU TRỰC TIẾP",
  workspaceTitle: "Soi được lập luận, không chỉ câu trả lời.",
  workspaceCopy:
    "Hỏi về bất kỳ chủ đề nào trong 48 chủ đề Wikipedia của XQuAD (Super Bowl 50, Nikola Tesla, Oxy, Thành Cát Tư Hãn, rừng Amazon…) bằng tiếng Việt hoặc tiếng Anh. Mỗi câu trả lời đều hiện kế hoạch truy hồi, thời gian đo thật của từng tác tử và đoạn văn đứng sau mỗi luận điểm.",

  queryLabel: "CÂU HỎI NGHIÊN CỨU",
  queryAria: "Câu hỏi nghiên cứu",
  runResearch: "Chạy nghiên cứu",
  runningAgents: "Đang chạy tác tử",
  modeGroup: "Chế độ nghiên cứu",
  modeDemo: "Demo",
  modeLive: "AI trực tiếp",

  fallbackTitle: "Đã rơi về chế độ dự phòng",
  fallbackBody: "Pipeline tất định đã hoàn tất lượt chạy này vì cổng mô hình không khả dụng.",
  errorGeneric: "Lượt nghiên cứu thất bại",
  errorLength: "Hãy đặt câu hỏi cụ thể, dài từ 12 đến 500 ký tự.",
  errorRateLimited: "Quá nhiều yêu cầu. Hãy đợi một chút rồi chạy lại truy vấn.",

  agentActivity: "Hoạt động tác tử",
  handoffs: "lượt bàn giao",
  statusRevised: "Lượt sửa sai",
  statusComplete: "Hoàn tất",
  retrievalPlan: "Kế hoạch truy hồi",

  groundedRecommendation: "Câu trả lời có căn cứ",
  sourceLive: "Mô hình trực tiếp · AI Gateway",
  sourceDemo: "Demo tất định · không cần API key",
  confidenceAria: "độ tin cậy có căn cứ",
  confidenceLabel: "căn cứ",
  recommendation: "CÂU TRẢ LỜI",

  metricCoverage: "Độ phủ từ khóa",
  metricEvidence: "Bằng chứng chấp nhận",
  metricRounds: "Vòng phản biện",
  metricTime: "Thời gian pipeline",

  evidenceLedger: "Sổ bằng chứng",
  evidenceGrounded: "được chấp nhận",
  selectedPassage: "Đoạn đang chọn",
  viewSource: "Xem nguồn",
  stanceSupport: "được trích",
  stanceContext: "bối cảnh",

  archEyebrow: "VÌ SAO ĐÂY LÀ AGENTIC RAG",
  archTitle: "Một vòng lặp sửa sai—không phải một prompt bọc quanh tìm kiếm vector.",
  archCopy:
    "Một máy trạng thái LangGraph viết bằng Python. Tác tử phản biện đo câu hỏi được bằng chứng bao phủ bao nhiêu; khi thiếu, nó kích hoạt một lượt truy hồi có mục tiêu rồi chấm lại toàn bộ bằng chứng đã gộp trước khi cho phép tổng hợp. Trích dẫn nằm ngoài sổ bằng chứng bị loại bỏ.",
  archAria: "Kiến trúc Agentic RAG",
  archOrchestrator: "Điều phối",
  archOrchestratorCopy: "Nhận diện ngôn ngữ + ý định",
  archPlanner: "Tác tử lập kế hoạch",
  archPlannerCopy: "Câu hỏi, từ khóa, thực thể",
  archRetrieval: "Truy hồi lai",
  archRetrievalCopy: "BM25 + vector + RRF, EN + VI",
  archCritic: "Tác tử phản biện",
  archCriticCopy: "Đo độ phủ, tìm lỗ hổng",
  archSynthesizer: "Tổng hợp",
  archSynthesizerCopy: "Trả lời, trích dẫn được kiểm tra",

  techRetrievalTag: "TRUY HỒI",
  techRetrievalTitle: "Song ngữ nhờ chỉ mục, không nhờ dịch",
  techRetrievalCopy:
    "Mỗi đoạn văn được lập chỉ mục bằng cả tiếng Anh và tiếng Việt, và hai kết quả gộp về một mã đoạn văn. Câu hỏi tiếng Việt khớp thẳng với văn bản tiếng Việt — Recall@5 tăng từ dưới 50% (chỉ mục chỉ tiếng Anh) lên 97%.",
  techReliabilityTag: "ĐỘ TIN CẬY",
  techReliabilityTitle: "Suy giảm êm ái",
  techReliabilityCopy:
    "Tác tử trực tiếp chạy qua Vercel AI Gateway, đầu ra được Pydantic kiểm tra. Mọi lỗi cổng hay lỗi schema đều rơi về pipeline tất định, nên bản demo chạy được mà không cần khóa bí mật hay quota.",
  techEvaluationTag: "ĐÁNH GIÁ",
  techEvaluationTitle: "Đo trên 1.190 câu hỏi có nhãn",
  techEvaluationCopy:
    "scripts/evaluate.py báo cáo Recall@k, MRR, tỷ lệ trích đúng đoạn chuẩn, độ chính xác câu trả lời, tỷ lệ kích hoạt vòng sửa sai và độ trễ cho cả hai ngôn ngữ. Các con số trên trang này lấy từ báo cáo đó.",

  footerCopy: "Dự án portfolio kỹ thuật AI đặt bằng chứng lên hàng đầu. Dữ liệu: XQuAD (CC BY-SA 4.0).",
  footerStack: "Python · FastAPI · LangGraph · Next.js",

  sampleQuestions: samples.vi,

  agentNames: {
    Orchestrator: "Điều phối",
    "Query Planner": "Lập kế hoạch truy vấn",
    "Hybrid Retriever": "Truy hồi lai",
    "Evidence Critic": "Phản biện bằng chứng",
    "Answer Synthesizer": "Tổng hợp câu trả lời",
  } as Record<AgentName, string>,
};

export const dictionaries: Record<Locale, Dictionary> = { en, vi };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
