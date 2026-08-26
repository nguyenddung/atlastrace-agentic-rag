import type { AgentName } from "@/lib/rag/types";
import type { Locale } from "./locale";

const en = {
  localeName: "English",
  localeShort: "EN",
  switchLanguage: "Switch language",

  brandTagline: "Fleet intelligence",
  navDecisionRoom: "Decision room",
  navArchitecture: "Architecture",
  navSource: "Source",
  systemReady: "System ready",

  painEyebrow: "THE PAIN POINT",
  heroTitleLead: "High-stakes fleet decisions are buried in",
  heroTitleEmphasis: "contradictory evidence.",
  heroCopy:
    "Operations leaders must reconcile pilot results, telemetry gaps, ROI, safety controls and EU worker privacy before a predictive-maintenance rollout. Single-pass RAG retrieves a plausible answer; it rarely checks what it missed.",

  briefLabel: "Decision brief / EU-2026-04",
  briefStatus: "OPEN",
  briefQuestion: "Should Northstar expand FleetSense to 2,400 EU vehicles?",
  briefOperations: "Operations",
  briefOperationsValue: "18% less downtime",
  briefFinance: "Finance",
  briefFinanceValue: "€1.4M year-one cost",
  briefData: "Data",
  briefDataValue: "37% not ready",
  briefRisk: "Risk",
  briefRiskValue: "Human gate required",
  briefFooter: "8 siloed documents · 5 stakeholder views · 1 auditable decision",

  solutionStrip: "AtlasTrace turns the evidence trail into a decision trail.",
  stepPlan: "Plan",
  stepRetrieve: "Retrieve",
  stepCritique: "Critique",
  stepSynthesize: "Synthesize",

  workspaceEyebrow: "LIVE DECISION ROOM",
  workspaceTitle: "Inspect the reasoning, not just the answer.",
  workspaceCopy:
    "Every recommendation exposes retrieval paths, agent handoffs, rejected assumptions and source-level grounding.",

  queryLabel: "DECISION QUERY",
  queryAria: "Decision question",
  runResearch: "Run research",
  runningAgents: "Running agents",
  modeGroup: "Research mode",
  modeDemo: "Demo",
  modeLive: "Live AI",

  fallbackTitle: "Live AI fallback",
  fallbackBody:
    "The deterministic retrieval pipeline completed this run because the model gateway was unavailable.",
  errorGeneric: "Research run failed",
  errorLength: "Ask a specific question between 12 and 500 characters.",

  agentActivity: "Agent activity",
  handoffs: "handoffs",
  statusRevised: "Corrective pass",
  statusComplete: "Complete",
  retrievalPlan: "Retrieval plan",

  groundedRecommendation: "Grounded recommendation",
  sourceLive: "Live model · AI Gateway",
  sourceDemo: "Deterministic demo · zero API keys",
  confidenceAria: "grounded confidence",
  confidenceLabel: "grounded",
  recommendation: "RECOMMENDATION",

  metricDocuments: "Documents scanned",
  metricEvidence: "Evidence selected",
  metricRounds: "Critique rounds",
  metricTime: "Pipeline time",

  evidenceLedger: "Evidence ledger",
  evidenceGrounded: "grounded",
  selectedPassage: "Selected passage",
  viewSource: "View source",
  stanceSupport: "support",
  stanceContext: "context",
  stanceRisk: "risk",

  archEyebrow: "WHY THIS IS AGENTIC RAG",
  archTitle: "A corrective loop—not a prompt wrapped around vector search.",
  archCopy:
    "The critic can reject weak coverage and trigger a targeted second retrieval before synthesis. Every stage has a narrow role, typed output and observable handoff.",
  archAria: "Agentic RAG architecture",
  archOrchestrator: "Orchestrator",
  archOrchestratorCopy: "Routes the decision",
  archPlanner: "Planner agent",
  archPlannerCopy: "Decomposes intent",
  archRetrieval: "Hybrid retrieval",
  archRetrievalCopy: "BM25 + vectors + RRF",
  archCritic: "Critic agent",
  archCriticCopy: "Grades + finds gaps",
  archSynthesizer: "Synthesizer",
  archSynthesizerCopy: "Answers with citations",

  techRetrievalTag: "RETRIEVAL",
  techRetrievalTitle: "Hybrid by design",
  techRetrievalCopy:
    "BM25 catches exact policy terms; concept-expanded vectors surface related operational evidence; reciprocal rank fusion balances both. Vietnamese questions are bridged into the same concept space, so retrieval works in either language.",
  techReliabilityTag: "RELIABILITY",
  techReliabilityTitle: "Graceful degradation",
  techReliabilityCopy:
    "Live agents run through Vercel AI Gateway. A deterministic evidence pipeline keeps the recruiter demo functional without secrets or quota.",
  techEvaluationTag: "EVALUATION",
  techEvaluationTitle: "Observable quality",
  techEvaluationCopy:
    "Coverage, counter-evidence, citation validity, source diversity and latency are surfaced as first-class product metrics.",

  footerCopy: "Built as an evidence-first AI engineering portfolio project.",
  footerStack: "Next.js · AI SDK · Vercel AI Gateway",

  sampleQuestions: [
    "Should Northstar roll out predictive maintenance across its EU fleet?",
    "What controls are required before FleetSense can enter production?",
    "Which fleet segment offers the safest and fastest payback?",
  ],

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

  brandTagline: "Trí tuệ đội xe",
  navDecisionRoom: "Phòng quyết định",
  navArchitecture: "Kiến trúc",
  navSource: "Mã nguồn",
  systemReady: "Hệ thống sẵn sàng",

  painEyebrow: "VẤN ĐỀ CỐT LÕI",
  heroTitleLead: "Quyết định lớn về đội xe bị chôn vùi trong",
  heroTitleEmphasis: "bằng chứng mâu thuẫn.",
  heroCopy:
    "Trước khi triển khai bảo trì dự đoán, lãnh đạo vận hành phải dung hòa kết quả pilot, lỗ hổng telemetry, ROI, kiểm soát an toàn và quyền riêng tư người lao động EU. RAG một lượt trả về một câu trả lời nghe hợp lý; nó hiếm khi kiểm tra xem mình đã bỏ sót điều gì.",

  briefLabel: "Hồ sơ quyết định / EU-2026-04",
  briefStatus: "ĐANG MỞ",
  briefQuestion: "Northstar có nên mở rộng FleetSense ra 2.400 xe tại EU?",
  briefOperations: "Vận hành",
  briefOperationsValue: "Giảm 18% downtime",
  briefFinance: "Tài chính",
  briefFinanceValue: "Chi phí €1,4M năm đầu",
  briefData: "Dữ liệu",
  briefDataValue: "37% chưa sẵn sàng",
  briefRisk: "Rủi ro",
  briefRiskValue: "Bắt buộc người duyệt",
  briefFooter: "8 tài liệu rời rạc · 5 góc nhìn · 1 quyết định truy vết được",

  solutionStrip: "AtlasTrace biến dấu vết bằng chứng thành dấu vết quyết định.",
  stepPlan: "Lập kế hoạch",
  stepRetrieve: "Truy hồi",
  stepCritique: "Phản biện",
  stepSynthesize: "Tổng hợp",

  workspaceEyebrow: "PHÒNG QUYẾT ĐỊNH TRỰC TIẾP",
  workspaceTitle: "Soi được lập luận, không chỉ câu trả lời.",
  workspaceCopy:
    "Mỗi khuyến nghị đều phơi bày đường truy hồi, các bước bàn giao giữa tác tử, giả định bị loại bỏ và nguồn gốc từng luận điểm.",

  queryLabel: "CÂU HỎI QUYẾT ĐỊNH",
  queryAria: "Câu hỏi quyết định",
  runResearch: "Chạy nghiên cứu",
  runningAgents: "Đang chạy tác tử",
  modeGroup: "Chế độ nghiên cứu",
  modeDemo: "Demo",
  modeLive: "AI trực tiếp",

  fallbackTitle: "Đã rơi về chế độ dự phòng",
  fallbackBody:
    "Pipeline truy hồi tất định đã hoàn tất lượt chạy này vì cổng mô hình không khả dụng.",
  errorGeneric: "Lượt nghiên cứu thất bại",
  errorLength: "Hãy đặt câu hỏi cụ thể, dài từ 12 đến 500 ký tự.",

  agentActivity: "Hoạt động tác tử",
  handoffs: "lượt bàn giao",
  statusRevised: "Lượt sửa sai",
  statusComplete: "Hoàn tất",
  retrievalPlan: "Kế hoạch truy hồi",

  groundedRecommendation: "Khuyến nghị có căn cứ",
  sourceLive: "Mô hình trực tiếp · AI Gateway",
  sourceDemo: "Demo tất định · không cần API key",
  confidenceAria: "độ tin cậy có căn cứ",
  confidenceLabel: "căn cứ",
  recommendation: "KHUYẾN NGHỊ",

  metricDocuments: "Tài liệu đã quét",
  metricEvidence: "Bằng chứng đã chọn",
  metricRounds: "Vòng phản biện",
  metricTime: "Thời gian pipeline",

  evidenceLedger: "Sổ bằng chứng",
  evidenceGrounded: "căn cứ",
  selectedPassage: "Đoạn đang chọn",
  viewSource: "Xem nguồn",
  stanceSupport: "ủng hộ",
  stanceContext: "bối cảnh",
  stanceRisk: "rủi ro",

  archEyebrow: "VÌ SAO ĐÂY LÀ AGENTIC RAG",
  archTitle: "Một vòng lặp sửa sai—không phải một prompt bọc quanh tìm kiếm vector.",
  archCopy:
    "Tác tử phản biện có quyền bác bỏ độ phủ yếu và kích hoạt một lượt truy hồi thứ hai có mục tiêu trước khi tổng hợp. Mỗi khâu có vai trò hẹp, đầu ra định kiểu và bàn giao quan sát được.",
  archAria: "Kiến trúc Agentic RAG",
  archOrchestrator: "Điều phối",
  archOrchestratorCopy: "Định tuyến quyết định",
  archPlanner: "Tác tử lập kế hoạch",
  archPlannerCopy: "Tách nhỏ ý định",
  archRetrieval: "Truy hồi lai",
  archRetrievalCopy: "BM25 + vector + RRF",
  archCritic: "Tác tử phản biện",
  archCriticCopy: "Chấm điểm + tìm lỗ hổng",
  archSynthesizer: "Tổng hợp",
  archSynthesizerCopy: "Trả lời kèm trích dẫn",

  techRetrievalTag: "TRUY HỒI",
  techRetrievalTitle: "Lai ghép có chủ đích",
  techRetrievalCopy:
    "BM25 bắt đúng thuật ngữ chính sách; vector mở rộng khái niệm khơi ra bằng chứng vận hành liên quan; reciprocal rank fusion cân bằng cả hai. Câu hỏi tiếng Việt được bắc cầu vào cùng không gian khái niệm, nên truy hồi hoạt động ở cả hai ngôn ngữ.",
  techReliabilityTag: "ĐỘ TIN CẬY",
  techReliabilityTitle: "Suy giảm êm ái",
  techReliabilityCopy:
    "Tác tử trực tiếp chạy qua Vercel AI Gateway. Pipeline bằng chứng tất định giữ cho bản demo luôn dùng được mà không cần khóa bí mật hay quota.",
  techEvaluationTag: "ĐÁNH GIÁ",
  techEvaluationTitle: "Chất lượng quan sát được",
  techEvaluationCopy:
    "Độ phủ, bằng chứng phản bác, tính hợp lệ của trích dẫn, độ đa dạng nguồn và độ trễ đều được đưa lên thành chỉ số sản phẩm hạng nhất.",

  footerCopy: "Dự án portfolio kỹ thuật AI đặt bằng chứng lên hàng đầu.",
  footerStack: "Next.js · AI SDK · Vercel AI Gateway",

  sampleQuestions: [
    "Northstar có nên triển khai bảo trì dự đoán cho toàn đội xe EU không?",
    "Cần những kiểm soát nào trước khi FleetSense được đưa vào vận hành?",
    "Phân khúc đội xe nào an toàn nhất và hoàn vốn nhanh nhất?",
  ],

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
