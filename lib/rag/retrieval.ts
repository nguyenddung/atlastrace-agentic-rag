import { knowledgeBase, type KnowledgeDocument } from "./corpus";

const stopWords = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "should", "the", "to", "what", "with"]);

const concepts: Record<string, string[]> = {
  deploy: ["rollout", "production", "promotion"],
  rollout: ["deploy", "expansion", "launch"],
  safe: ["risk", "oversight", "rollback", "audit"],
  safety: ["risk", "incident", "oversight"],
  cost: ["roi", "payback", "investment"],
  value: ["roi", "payback", "downtime"],
  reliable: ["availability", "slo", "monitoring"],
  trust: ["explanation", "adoption", "override"],
  europe: ["eu", "germany", "netherlands"],
  european: ["eu", "germany", "netherlands"],
};

export type RetrievedDocument = KnowledgeDocument & {
  bm25: number;
  vector: number;
  fused: number;
  rationale: string;
};

export function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9€%]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function expandedTokens(value: string) {
  const base = tokenize(value);
  return [...base, ...base.flatMap((token) => concepts[token] ?? [])];
}

function bm25Score(queryTokens: string[], doc: KnowledgeDocument) {
  const docTokens = tokenize(`${doc.title} ${doc.tags.join(" ")} ${doc.text}`);
  const frequencies = new Map<string, number>();
  for (const token of docTokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  const averageLength = 105;
  const k1 = 1.5;
  const b = 0.75;

  return queryTokens.reduce((score, token) => {
    const frequency = frequencies.get(token) ?? 0;
    if (!frequency) return score;
    const documentsWithTerm = knowledgeBase.filter((item) => tokenize(`${item.title} ${item.tags.join(" ")} ${item.text}`).includes(token)).length;
    const idf = Math.log(1 + (knowledgeBase.length - documentsWithTerm + 0.5) / (documentsWithTerm + 0.5));
    const denominator = frequency + k1 * (1 - b + b * (docTokens.length / averageLength));
    return score + idf * ((frequency * (k1 + 1)) / denominator);
  }, 0);
}

function vectorize(tokens: string[], dimensions = 96) {
  const vector = new Array<number>(dimensions).fill(0);
  const features = [...tokens, ...tokens.slice(0, -1).map((token, index) => `${token}_${tokens[index + 1]}`)];
  for (const feature of features) {
    let hash = 2166136261;
    for (let index = 0; index < feature.length; index += 1) {
      hash ^= feature.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    vector[Math.abs(hash) % dimensions] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

function cosine(left: number[], right: number[]) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function normalize(value: number, max: number) {
  return max === 0 ? 0 : value / max;
}

export function retrieveHybrid(question: string, plannedQueries: string[], limit = 6): RetrievedDocument[] {
  const queries = plannedQueries.length ? plannedQueries : [question];
  const queryTokens = expandedTokens(queries.join(" "));
  const queryVector = vectorize(queryTokens);

  const scored = knowledgeBase.map((doc) => {
    const bm25 = bm25Score(queryTokens, doc);
    const vector = cosine(queryVector, vectorize(expandedTokens(`${doc.title} ${doc.tags.join(" ")} ${doc.text}`)));
    return { doc, bm25, vector };
  });

  const maxBm25 = Math.max(...scored.map((item) => item.bm25), 0);
  const maxVector = Math.max(...scored.map((item) => item.vector), 0);
  const lexicalRank = [...scored].sort((a, b) => b.bm25 - a.bm25);
  const vectorRank = [...scored].sort((a, b) => b.vector - a.vector);

  return scored
    .map(({ doc, bm25, vector }) => {
      const rrf = 1 / (60 + lexicalRank.findIndex((item) => item.doc.id === doc.id) + 1) + 1 / (60 + vectorRank.findIndex((item) => item.doc.id === doc.id) + 1);
      const fused = 0.42 * normalize(bm25, maxBm25) + 0.38 * normalize(vector, maxVector) + 0.2 * normalize(rrf, 2 / 61);
      const matched = [...new Set(queryTokens.filter((token) => tokenize(`${doc.title} ${doc.tags.join(" ")} ${doc.text}`).includes(token)))].slice(0, 4);
      return {
        ...doc,
        bm25,
        vector,
        fused,
        rationale: matched.length ? `Matched ${matched.join(", ")}` : "Conceptual vector match",
      };
    })
    .sort((a, b) => b.fused - a.fused)
    .slice(0, limit);
}

