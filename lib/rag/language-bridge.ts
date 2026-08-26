/**
 * Cross-lingual bridge.
 *
 * The knowledge base is English, and BM25 scores exact terms, so a Vietnamese
 * question would otherwise retrieve noise. Rather than translating the corpus
 * (which would break lexical scoring) or embedding a second index, Vietnamese
 * decision vocabulary is mapped into the same English concept space the
 * retriever already uses. The original question is preserved; English terms are
 * appended, so a purely English question is bridged to itself unchanged.
 */

/** Strips Vietnamese tone marks and folds đ/Đ, which NFD leaves intact. */
export function deaccent(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * De-accented Vietnamese phrase → English concept terms.
 * Multi-syllable phrases only: single Vietnamese syllables are too ambiguous to
 * map safely (e.g. "do" alone is a dozen different words).
 */
const vietnameseConcepts: Record<string, string> = {
  "bao tri du doan": "predictive maintenance",
  "bao tri": "maintenance",
  "doi xe": "fleet vehicles",
  "xe dong lanh": "refrigerated vehicles",
  "trien khai": "rollout deploy launch",
  "mo rong": "expansion rollout",
  "ra mat": "launch",
  "van hanh": "operations",
  "san xuat": "production",
  "thu nghiem": "pilot",
  "chay thu": "pilot shadow evaluation",
  "rui ro": "risk",
  "an toan": "safety oversight",
  "kiem soat": "control governance oversight",
  "quan tri": "governance",
  "phe duyet": "approval human oversight",
  "con nguoi duyet": "human approval",
  "giam sat": "monitoring oversight",
  "kiem toan": "audit",
  "nhat ky": "logs audit",
  "quay lui": "rollback",
  "khoi phuc": "rollback",
  "chi phi": "cost investment",
  "hoan von": "payback roi",
  "loi nhuan": "roi payback",
  "ngan sach": "cost investment budget",
  "gia tri": "value roi",
  "du lieu": "data telemetry",
  "chat luong du lieu": "data quality",
  "cam bien": "sensors telemetry",
  "do phu": "coverage",
  "san sang": "readiness",
  "thoi gian chet": "downtime",
  "su co": "incident",
  "do tre": "latency",
  "do tin cay": "availability reliability slo",
  "mo hinh": "model",
  "troi dat": "drift",
  "sai lech": "drift",
  "danh gia": "evaluation",
  "bang chung": "evidence",
  "quyet dinh": "decision",
  "khuyen nghi": "recommendation",
  "quyen rieng tu": "privacy",
  "phap ly": "legal governance",
  "nguoi lao dong": "workers",
  "tai xe": "driver",
  "chau au": "europe eu",
  "duc va ha lan": "germany netherlands",
  "ha lan": "netherlands",
  "nuoc duc": "germany",
  "phan khuc": "segment",
  "uu tien": "priority prioritize",
  "nhanh nhat": "fastest",
  "kien truc": "architecture",
  "dao tao": "training",
  "chap nhan": "adoption",
  "tin tuong": "trust",
};

// Longest phrases first so "chat luong du lieu" wins over "du lieu".
const orderedPhrases = Object.keys(vietnameseConcepts).sort((a, b) => b.length - a.length);

/**
 * Appends the English concept terms for every Vietnamese phrase found.
 * English input is returned unchanged, so existing behaviour is preserved.
 */
export function bridgeToEnglish(value: string) {
  const haystack = deaccent(value.toLowerCase());
  const additions: string[] = [];

  for (const phrase of orderedPhrases) {
    if (haystack.includes(phrase)) additions.push(vietnameseConcepts[phrase]);
  }

  if (!additions.length) return value;
  return `${value} ${[...new Set(additions.join(" ").split(" "))].join(" ")}`;
}
