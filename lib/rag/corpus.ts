export type KnowledgeDocument = {
  id: string;
  title: string;
  source: string;
  date: string;
  tags: string[];
  stance: "support" | "context" | "risk";
  text: string;
};

export const knowledgeBase: KnowledgeDocument[] = [
  {
    id: "OPS-17",
    title: "Predictive maintenance pilot: Q2 field report",
    source: "Operations / Fleet Reliability",
    date: "2026-06-18",
    tags: ["maintenance", "fleet", "pilot", "downtime", "sensors"],
    stance: "support",
    text: "A 12-week pilot across 84 refrigerated vehicles reduced unplanned downtime by 18% and roadside incidents by 11%. Precision was 0.82 for compressor failures, but only 0.61 for brake wear. The strongest results came from vehicles with at least nine months of clean telemetry. The report recommends a staged rollout, beginning with refrigeration systems and a human review gate for every maintenance recommendation.",
  },
  {
    id: "FIN-08",
    title: "Fleet intelligence business case",
    source: "Finance / Investment Committee",
    date: "2026-07-02",
    tags: ["cost", "roi", "fleet", "maintenance", "rollout"],
    stance: "support",
    text: "The proposed European rollout costs €1.4M in year one, including sensors, integration, training, and monitoring. At the pilot's conservative 12% downtime reduction, the modeled payback period is 19 months. A broad all-at-once deployment pushes payback beyond 30 months because 37% of the fleet lacks reliable telemetry. A refrigeration-first rollout is projected to reach positive cash flow in month 14.",
  },
  {
    id: "RISK-12",
    title: "Model risk review: maintenance recommendations",
    source: "Risk & Compliance",
    date: "2026-07-09",
    tags: ["risk", "human oversight", "drift", "audit", "maintenance"],
    stance: "risk",
    text: "Automated maintenance recommendations can create safety and liability exposure when training data does not represent vehicle age, climate, or depot practices. Risk requires human approval for safety-critical work orders, monthly drift checks by vehicle class, immutable decision logs, and an immediate rollback path. The model must not autonomously delay scheduled maintenance.",
  },
  {
    id: "LEGAL-04",
    title: "EU deployment control memo",
    source: "Legal / Digital Regulation",
    date: "2026-06-27",
    tags: ["eu", "governance", "privacy", "workers", "ai act"],
    stance: "risk",
    text: "Telemetry used for asset health can indirectly reveal driver behavior. The EU rollout should enforce purpose limitation, minimum retention, role-based access, and worker notice. The system is framed as decision support for equipment maintenance, not employee performance scoring. Legal advises a documented impact assessment before expanding beyond the pilot countries.",
  },
  {
    id: "ENG-23",
    title: "FleetSense production architecture",
    source: "Engineering / Architecture Decision Record",
    date: "2026-07-15",
    tags: ["architecture", "streaming", "monitoring", "rollback", "telemetry"],
    stance: "context",
    text: "FleetSense ingests telemetry through regional queues, computes features in a streaming pipeline, and serves risk scores through a versioned API. Each prediction records model version, feature freshness, confidence, and the approving operator. Shadow evaluation runs for two weeks before promotion. Regional kill switches and blue-green model deployment keep rollback under five minutes.",
  },
  {
    id: "DATA-05",
    title: "Telemetry readiness audit",
    source: "Data Platform / Quality Council",
    date: "2026-06-12",
    tags: ["data quality", "telemetry", "coverage", "fleet", "eu"],
    stance: "risk",
    text: "Sixty-three percent of the European fleet meets the production threshold of 95% sensor completeness. Refrigerated vehicles reach 88% readiness; older dry vans reach 41%. Germany and the Netherlands have the strongest coverage. The audit recommends blocking model inference when feature freshness exceeds 15 minutes and publishing data-quality scores beside every recommendation.",
  },
  {
    id: "SRE-19",
    title: "AI service reliability objectives",
    source: "Platform SRE / Service Handbook",
    date: "2026-07-20",
    tags: ["slo", "latency", "availability", "incident", "monitoring"],
    stance: "context",
    text: "Production decision-support services target 99.9% monthly availability and p95 response time below 800 ms. Any safety-related false-negative spike triggers severity-one response within 15 minutes. Teams must monitor input drift, output distribution, override rate, and time-to-human-review in addition to standard infrastructure metrics.",
  },
  {
    id: "PEOPLE-03",
    title: "Depot adoption interviews",
    source: "Product Research / Field Operations",
    date: "2026-06-30",
    tags: ["adoption", "operators", "workflow", "training", "trust"],
    stance: "context",
    text: "Depot managers valued early warnings but ignored alerts that lacked a plain-language explanation or component history. Adoption rose from 46% to 79% when each alert showed supporting sensor trends and allowed operators to record an override reason. Managers requested role-specific training and weekly feedback sessions during rollout.",
  },
];

