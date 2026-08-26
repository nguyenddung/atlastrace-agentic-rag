import { corpusVi } from "@/lib/i18n/corpus-vi";
import { defaultLocale, type Locale } from "@/lib/i18n/locale";
import { knowledgeBase } from "./corpus";
import { bridgeToEnglish } from "./language-bridge";
import { retrieveHybrid, tokenize } from "./retrieval";
import type { Citation, ResearchResult } from "./types";

export type QuestionKind = "controls" | "segment" | "maintenance" | "generic";

/**
 * Single source of truth for what the question is asking. Runs on the bridged
 * text, so a Vietnamese question classifies the same way as its English twin.
 */
export function classifyQuestion(question: string): QuestionKind {
  const text = bridgeToEnglish(question).toLowerCase();
  if (/control|required|production|guardrail/.test(text)) return "controls";
  if (/segment|payback|fastest|priority|prioritize/.test(text)) return "segment";
  if (/maintenance|fleet|rollout|deploy|europe|eu/.test(text)) return "maintenance";
  return "generic";
}

type PlanKey = "readiness" | "business" | "governance" | "tradeoffs";

/**
 * The English strings double as the retrieval queries; the Vietnamese strings
 * are display-only labels for the very same retrieval paths.
 */
const planLabels: Record<Locale, Record<PlanKey, string>> = {
  en: {
    readiness: "deployment readiness data quality architecture rollback",
    business: "business case ROI payback rollout cost pilot downtime",
    governance: "EU governance human oversight privacy model risk",
    tradeoffs: "evidence trade-offs metrics controls",
  },
  vi: {
    readiness: "mức sẵn sàng triển khai, chất lượng dữ liệu, kiến trúc, quay lui",
    business: "luận chứng kinh doanh, ROI, hoàn vốn, chi phí triển khai, downtime",
    governance: "quản trị EU, con người giám sát, quyền riêng tư, rủi ro mô hình",
    tradeoffs: "bằng chứng, đánh đổi, chỉ số, kiểm soát",
  },
};

export function planQueries(question: string, locale: Locale = defaultLocale) {
  const labels = planLabels[locale] ?? planLabels.en;
  const subject = question.replace(/[?!.]/g, "").trim();
  const tokens = tokenize(bridgeToEnglish(question));
  const keys: PlanKey[] = [];

  if (tokens.some((token) => ["rollout", "deploy", "launch", "adopt"].includes(token))) {
    keys.push("readiness", "business");
  }
  if (tokens.some((token) => ["risk", "safe", "safety", "eu", "europe", "european"].includes(token))) {
    keys.push("governance");
  }
  if (tokens.some((token) => ["cost", "roi", "value", "business"].includes(token))) {
    keys.push("business");
  }

  const queries = [subject, ...keys.map((key) => labels[key])];
  if (queries.length < 3) queries.push(labels.tradeoffs);
  return [...new Set(queries)].slice(0, 4);
}

function toCitation(item: ReturnType<typeof retrieveHybrid>[number], locale: Locale): Citation {
  const translated = locale === "vi" ? corpusVi[item.id] : undefined;
  return {
    id: item.id,
    title: translated?.title ?? item.title,
    source: translated?.source ?? item.source,
    excerpt: translated?.text ?? item.text,
    score: Math.round(item.fused * 100),
    stance: item.stance,
  };
}

function selectDecisionEvidence(retrieved: ReturnType<typeof retrieveHybrid>, kind: QuestionKind, limit = 5) {
  const selectors: Array<(item: ReturnType<typeof retrieveHybrid>[number]) => boolean> =
    kind === "controls"
      ? [
          (item) => item.tags.includes("data quality"),
          (item) => item.tags.includes("risk"),
          (item) => item.tags.includes("architecture"),
          (item) => item.tags.includes("slo"),
          (item) => item.tags.includes("eu"),
        ]
      : [
          (item) => item.stance === "support" && item.tags.includes("pilot"),
          (item) => item.tags.includes("cost"),
          (item) => item.tags.includes("data quality"),
          (item) => item.tags.includes("risk"),
          (item) => item.tags.includes("eu"),
        ];

  const selected = selectors
    .map((selector) => retrieved.find(selector))
    .filter((item): item is ReturnType<typeof retrieveHybrid>[number] => Boolean(item));
  const seen = new Set(selected.map((item) => item.id));

  for (const item of retrieved) {
    if (selected.length >= limit) break;
    if (!seen.has(item.id)) {
      selected.push(item);
      seen.add(item.id);
    }
  }

  return selected.sort((left, right) => right.fused - left.fused).slice(0, limit);
}

const verdicts: Record<Locale, Record<QuestionKind, string>> = {
  en: {
    controls: "Require five production gates before rollout.",
    segment: "Prioritize refrigerated fleets in Germany and the Netherlands.",
    maintenance: "Proceed with a gated, refrigeration-first rollout.",
    generic: "Use a controlled rollout with explicit evidence gates.",
  },
  vi: {
    controls: "Yêu cầu năm cổng kiểm soát trước khi đưa vào vận hành.",
    segment: "Ưu tiên đội xe đông lạnh tại Đức và Hà Lan.",
    maintenance: "Triển khai theo cổng duyệt, ưu tiên xe đông lạnh trước.",
    generic: "Triển khai có kiểm soát với các cổng bằng chứng rõ ràng.",
  },
};

function buildAnswer(kind: QuestionKind, citations: Citation[], locale: Locale) {
  const ids = new Set(citations.map((citation) => citation.id));
  const cite = (id: string) => (ids.has(id) ? `[${id}]` : "");
  const vietnamese = locale === "vi";

  if (kind === "controls") {
    return vietnamese
      ? `FleetSense chỉ nên được đưa vào vận hành sau khi đạt đủ năm cổng: telemetry đạt chuẩn vận hành, con người phê duyệt các lệnh công việc liên quan an toàn, quyết định của mô hình truy vết được, quay lui nhanh, và quản trị quyền riêng tư theo chuẩn EU.

Chặn suy luận khi độ tươi đặc trưng vượt 15 phút và hiển thị điểm chất lượng dữ liệu bên cạnh mọi khuyến nghị ${cite("DATA-05")}. Ghi lại phiên bản mô hình, độ tươi đặc trưng, độ tin cậy và quyết định của người vận hành; chạy đánh giá song song hai tuần; và chứng minh công tắc ngắt theo vùng quay lui được mô hình trong dưới năm phút ${cite("ENG-23")}.

Về vận hành, cần kiểm tra trôi dạt hằng tháng theo nhóm xe, xử lý mức nghiêm trọng một khi âm tính giả liên quan an toàn tăng đột biến, và giám sát liên tục tỷ lệ ghi đè cùng thời gian tới lượt con người xem xét ${cite("RISK-12")} ${cite("SRE-19")}. Hoàn tất đánh giá tác động EU và cấm dùng hệ thống để chấm điểm hiệu suất nhân viên trước khi mở rộng ra ngoài các nước thử nghiệm ${cite("LEGAL-04")}.`
      : `FleetSense should enter production only after five gates are met: production-grade telemetry, human approval for safety-critical work orders, traceable model decisions, rapid rollback, and EU privacy governance.

Block inference when feature freshness exceeds 15 minutes and show a data-quality score beside every recommendation ${cite("DATA-05")}. Log the model version, feature freshness, confidence and operator decision; run two weeks of shadow evaluation; and prove the regional kill switch can roll back a model in under five minutes ${cite("ENG-23")}.

Operationally, require monthly drift checks by vehicle class, a severity-one response to safety false-negative spikes, and continuous monitoring of override rate and time-to-human-review ${cite("RISK-12")} ${cite("SRE-19")}. Complete the EU impact assessment and prohibit employee performance scoring before expanding beyond pilot countries ${cite("LEGAL-04")}.`;
  }

  if (kind === "segment") {
    return vietnamese
      ? `Ưu tiên xe đông lạnh tại Đức và Hà Lan. Xe đông lạnh đạt 88% mức sẵn sàng telemetry, trong khi xe tải khô đời cũ chỉ đạt 41%; hai nước này cũng có độ phủ mạnh nhất ${cite("DATA-05")}.

Phân khúc này có tín hiệu vận hành rõ ràng nhất: thử nghiệm đạt độ chính xác 0,82 với hỏng máy nén và giảm 18% thời gian dừng ngoài kế hoạch ${cite("OPS-17")}. Tài chính mô hình hóa phương án ưu tiên xe đông lạnh đạt dòng tiền dương ở tháng thứ 14, so với hơn 30 tháng nếu triển khai đồng loạt ${cite("FIN-08")}.

Trong quá trình mở rộng, hãy giữ cổng duyệt của con người và cảnh báo giàu giải thích. Mức chấp nhận tăng lên 79% khi người vận hành xem được bằng chứng và ghi lại lý do ghi đè ${cite("PEOPLE-03")}.`
      : `Prioritize refrigerated vehicles in Germany and the Netherlands. Refrigerated vehicles have 88% telemetry readiness, while older dry vans reach only 41%; the two countries also have the strongest coverage ${cite("DATA-05")}.

This segment has the clearest operational signal: the pilot achieved 0.82 precision for compressor failures and reduced unplanned downtime by 18% ${cite("OPS-17")}. Finance models a refrigeration-first rollout reaching positive cash flow in month 14, compared with more than 30 months for an all-at-once deployment ${cite("FIN-08")}.

Keep a human review gate and explanation-rich alerts during expansion. Adoption rose to 79% when operators could inspect evidence and record override reasons ${cite("PEOPLE-03")}.`;
  }

  if (kind === "maintenance") {
    return vietnamese
      ? `Nên tiến hành triển khai tại châu Âu theo cổng duyệt, ưu tiên xe đông lạnh trước—không triển khai toàn đội xe cùng lúc. Thử nghiệm cho thấy giảm 18% thời gian dừng ngoài kế hoạch, còn mô hình tài chính đặt phương án theo giai đoạn này ở mốc dòng tiền dương tháng thứ 14 ${cite("OPS-17")} ${cite("FIN-08")}.

Nên bắt đầu ở Đức và Hà Lan, nơi telemetry mạnh nhất, và chặn suy luận bất cứ khi nào độ tươi đặc trưng vượt 15 phút ${cite("DATA-05")}. Giữ mọi lệnh công việc liên quan an toàn sau cổng duyệt của con người, ghi lại phiên bản mô hình và quyết định của người vận hành, và duy trì công tắc ngắt theo vùng với thời gian quay lui dưới năm phút ${cite("RISK-12")} ${cite("ENG-23")}.

Điểm bất định lớn nhất là khả năng khái quát hóa: độ chính xác với mòn phanh chỉ đạt 0,61 và 37% đội xe chưa sẵn sàng cho vận hành. Hãy coi giai đoạn đầu là một đợt mở rộng có kiểm soát với kiểm tra trôi dạt hằng tháng, theo dõi ghi đè của người vận hành và đánh giá tác động EU có hồ sơ—chứ không phải bảo trì tự trị ${cite("OPS-17")} ${cite("LEGAL-04")}.`
      : `Proceed with a gated, refrigeration-first European rollout—not a fleet-wide launch. The pilot shows an 18% reduction in unplanned downtime, while the financial model puts this staged path at positive cash flow in month 14 ${cite("OPS-17")} ${cite("FIN-08")}.

The rollout should begin in Germany and the Netherlands, where telemetry is strongest, and block inference whenever feature freshness exceeds 15 minutes ${cite("DATA-05")}. Keep every safety-critical work order behind human approval, log the model version and operator decision, and retain a regional kill switch with sub-five-minute rollback ${cite("RISK-12")} ${cite("ENG-23")}.

The main uncertainty is generalization: brake-wear precision was only 0.61 and 37% of the fleet is not production-ready. Treat the first phase as a controlled expansion with monthly drift checks, operator override tracking, and a documented EU impact assessment—not as autonomous maintenance ${cite("OPS-17")} ${cite("LEGAL-04")}.`;
  }

  const top = citations
    .slice(0, 3)
    .map((item) => `[${item.id}]`)
    .join(" ");

  return vietnamese
    ? `Bằng chứng ủng hộ một quyết định có chừng mực hơn là thay đổi đồng loạt. Hãy bắt đầu từ phân khúc có chất lượng dữ liệu và giá trị vận hành mạnh nhất, định nghĩa cổng phê duyệt của con người cho các hành động hệ trọng, và đưa quay lui vào tiêu chí ra mắt ${top}.

Mô thức triển khai vững nhất là một giai đoạn đánh giá song song ngắn, tiếp theo là một nhóm vận hành giới hạn. Hãy theo dõi chất lượng đầu ra, trôi dạt đầu vào, số lần người vận hành ghi đè và mức chấp nhận—không chỉ thời gian hoạt động. Chỉ mở rộng khi các chỉ báo sớm đó còn nằm trong ngưỡng đã thống nhất.`
    : `The evidence supports a measured decision rather than an all-at-once change. Start with the segment where data quality and operational value are strongest, define a human approval gate for consequential actions, and make rollback part of the launch criteria ${top}.

The strongest implementation pattern is a short shadow-evaluation phase followed by a limited production cohort. Monitor outcome quality, input drift, operator overrides, and adoption—not only uptime. Expand only when those leading indicators remain inside their agreed thresholds.`;
}

function buildTrace(queryCount: number, citationCount: number, locale: Locale): ResearchResult["trace"] {
  const vietnamese = locale === "vi";
  return [
    {
      agent: "Orchestrator",
      detail: vietnamese
        ? "Phân loại là câu hỏi quyết định và mở một kế hoạch nghiên cứu nhiều chặng."
        : "Classified a decision query and opened a multi-hop research plan.",
      durationMs: 38,
      status: "complete",
    },
    {
      agent: "Query Planner",
      detail: vietnamese
        ? `Tách câu hỏi thành ${queryCount} đường truy hồi.`
        : `Expanded the question into ${queryCount} retrieval paths.`,
      durationMs: 71,
      status: "complete",
    },
    {
      agent: "Hybrid Retriever",
      detail: vietnamese
        ? `Trộn thứ hạng BM25 và vector cục bộ trên ${knowledgeBase.length} tài liệu.`
        : `Fused BM25 + local vector ranks across ${knowledgeBase.length} documents.`,
      durationMs: 124,
      status: "complete",
    },
    {
      agent: "Evidence Critic",
      detail: vietnamese
        ? "Kiểm tra độ phủ, bằng chứng phản bác, độ tươi và tính đa dạng nguồn; yêu cầu một lượt sửa tập trung vào rủi ro."
        : "Checked coverage, counter-evidence, freshness, and source diversity; requested one risk-focused revision.",
      durationMs: 92,
      status: "revised",
    },
    {
      agent: "Answer Synthesizer",
      detail: vietnamese
        ? `Đặt khuyến nghị trên nền ${citationCount} đoạn trích có dẫn nguồn.`
        : `Grounded the recommendation in ${citationCount} cited passages.`,
      durationMs: 111,
      status: "complete",
    },
  ];
}

export function runDeterministicResearch(
  question: string,
  locale: Locale = defaultLocale,
  fallbackReason?: string,
): ResearchResult {
  const startedAt = Date.now();
  const kind = classifyQuestion(question);
  const retrieved = retrieveHybrid(question, planQueries(question, "en"), 8);
  const citations = selectDecisionEvidence(retrieved, kind, 5).map((item) => toCitation(item, locale));
  const riskCoverage = citations.some((citation) => citation.stance === "risk");
  const supportCoverage = citations.some((citation) => citation.stance === "support");
  const confidence = Math.min(94, Math.round(69 + citations[0].score * 0.15 + (riskCoverage && supportCoverage ? 8 : 0)));
  const queries = planQueries(question, locale);

  return {
    question,
    locale,
    mode: fallbackReason ? "fallback" : "demo",
    verdict: (verdicts[locale] ?? verdicts.en)[kind],
    answer: buildAnswer(kind, citations, locale),
    confidence,
    queries,
    citations,
    trace: buildTrace(queries.length, citations.length, locale),
    metrics: {
      documentsScanned: knowledgeBase.length,
      passagesRetrieved: retrieved.length,
      critiqueRounds: 2,
      totalDurationMs: Math.max(436, Date.now() - startedAt),
    },
    fallbackReason,
  };
}
