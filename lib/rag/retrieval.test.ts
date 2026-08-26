import { describe, expect, it } from "vitest";
import { planQueries, runDeterministicResearch } from "./deterministic";
import { retrieveHybrid } from "./retrieval";

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
    const citedIds = [...result.answer.matchAll(/\[([A-Z]+-\d+)\]/g)].map((match) => match[1]);
    expect(citedIds.every((id) => result.citations.some((citation) => citation.id === id))).toBe(true);
    expect(result.citations.some((citation) => citation.id === "FIN-08")).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it("answers production-control questions with control evidence", () => {
    const result = runDeterministicResearch("What controls are required before FleetSense can enter production?");
    expect(result.answer).toMatch(/five gates|human approval/i);
    expect(result.answer).toMatch(/\[(RISK-12|ENG-23|DATA-05)\]/);
  });
});
