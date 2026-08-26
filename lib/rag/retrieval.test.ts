import { describe, expect, it } from "vitest";
import { classifyQuestion, planQueries, runDeterministicResearch } from "./deterministic";
import { bridgeToEnglish, deaccent } from "./language-bridge";
import { expandedTokens, retrieveHybrid, tokenize } from "./retrieval";

const citedIdsIn = (answer: string) => [...answer.matchAll(/\[([A-Z]+-\d+)\]/g)].map((match) => match[1]);

describe("agentic retrieval pipeline", () => {
  it("decomposes rollout questions into risk and readiness paths", () => {
    const queries = planQueries("Should we safely roll out predictive maintenance in Europe?");
    expect(queries.length).toBeGreaterThanOrEqual(3);
    expect(queries.join(" ")).toMatch(/readiness|governance/);
  });

  it("retrieves operational and counter-evidence", () => {
    const results = retrieveHybrid("Should Northstar deploy predictive maintenance across its EU fleet?", ["pilot downtime", "EU risk telemetry"], 6);
    expect(results.some((item) => item.stance === "support")).toBe(true);
    expect(results.some((item) => item.stance === "risk")).toBe(true);
  });

  it("returns only citations present in the evidence ledger", () => {
    const result = runDeterministicResearch("Should Northstar roll out predictive maintenance across its EU fleet?");
    expect(citedIdsIn(result.answer).every((id) => result.citations.some((citation) => citation.id === id))).toBe(true);
    expect(result.citations.some((citation) => citation.id === "FIN-08")).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it("answers production-control questions with control evidence", () => {
    const result = runDeterministicResearch("What controls are required before FleetSense can enter production?");
    expect(result.answer).toMatch(/five gates|human approval/i);
    expect(result.answer).toMatch(/\[(RISK-12|ENG-23|DATA-05)\]/);
  });
});

describe("cross-lingual bridge", () => {
  it("folds Vietnamese tone marks and the đ glyph", () => {
    expect(deaccent("triển khai đội xe")).toBe("trien khai doi xe");
  });

  it("leaves English questions untouched", () => {
    const question = "Should Northstar roll out predictive maintenance across its EU fleet?";
    expect(bridgeToEnglish(question)).toBe(question);
  });

  it("maps Vietnamese decision vocabulary into the English concept space", () => {
    const bridged = bridgeToEnglish("Chi phí triển khai và rủi ro là gì?").toLowerCase();
    expect(bridged).toContain("cost");
    expect(bridged).toContain("rollout");
    expect(bridged).toContain("risk");
  });

  it("classifies a question the same way in either language", () => {
    expect(classifyQuestion("Cần những kiểm soát nào trước khi FleetSense được đưa vào vận hành?")).toBe(
      classifyQuestion("What controls are required before FleetSense can enter production?"),
    );
    expect(classifyQuestion("Phân khúc đội xe nào an toàn nhất và hoàn vốn nhanh nhất?")).toBe("segment");
  });

  it("is the only reason a Vietnamese question scores against the English corpus", () => {
    const vietnamese = "Northstar có nên triển khai bảo trì dự đoán cho toàn đội xe EU không?";

    // Raw tokens carry no term the English index can score.
    expect(tokenize(vietnamese)).not.toContain("maintenance");
    // Bridged tokens land in the concept space the retriever indexes.
    const bridged = expandedTokens(vietnamese);
    expect(bridged).toContain("maintenance");
    expect(bridged).toContain("rollout");
    expect(bridged).toContain("fleet");
  });

  it("retrieves substantially the same evidence for a Vietnamese question as its English twin", () => {
    const vietnamese = "Northstar có nên triển khai bảo trì dự đoán cho toàn đội xe EU không?";
    const english = "Should Northstar roll out predictive maintenance across its EU fleet?";
    const viTop = retrieveHybrid(vietnamese, planQueries(vietnamese, "en"), 5);
    const enTop = retrieveHybrid(english, planQueries(english, "en"), 5).map((item) => item.id);

    // Ranking shifts a little between languages; coverage is what has to hold.
    const overlap = viTop.filter((item) => enTop.includes(item.id));
    expect(overlap.length).toBeGreaterThanOrEqual(3);
    expect(viTop.some((item) => item.stance === "support")).toBe(true);
    expect(viTop.some((item) => item.stance === "risk")).toBe(true);
  });
});

describe("localized results", () => {
  it("answers a Vietnamese question in Vietnamese with valid citations", () => {
    const result = runDeterministicResearch("Northstar có nên triển khai bảo trì dự đoán cho toàn đội xe EU không?", "vi");

    expect(result.locale).toBe("vi");
    expect(result.verdict).toMatch(/[à-ỹ]/i);
    expect(result.answer).toMatch(/[à-ỹ]/i);
    expect(citedIdsIn(result.answer).length).toBeGreaterThan(0);
    expect(citedIdsIn(result.answer).every((id) => result.citations.some((citation) => citation.id === id))).toBe(true);
  });

  it("renders the evidence ledger in the requested language", () => {
    const question = "Should Northstar roll out predictive maintenance across its EU fleet?";
    const en = runDeterministicResearch(question, "en");
    const vi = runDeterministicResearch(question, "vi");

    expect(vi.citations.map((citation) => citation.id)).toEqual(en.citations.map((citation) => citation.id));
    expect(vi.citations.every((citation, index) => citation.title !== en.citations[index].title)).toBe(true);
  });

  it("keeps agent trace and verdict in sync with the locale", () => {
    const vi = runDeterministicResearch("Cần những kiểm soát nào trước khi FleetSense được đưa vào vận hành?", "vi");
    expect(vi.trace.every((step) => step.detail.length > 0)).toBe(true);
    expect(vi.trace[0].detail).toMatch(/[à-ỹ]/i);
    expect(vi.verdict).toContain("cổng");
  });
});
