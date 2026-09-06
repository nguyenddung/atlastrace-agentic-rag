import { ImageResponse } from "next/og";

export const alt = "AtlasTrace — Multi-Agent Agentic RAG Decision Room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f5f0",
          color: "#12211d",
          padding: "72px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 3, transform: "rotate(-11deg)" }}>
            <div style={{ width: 14, height: 26, marginTop: 16, background: "#12211d", borderRadius: 4 }} />
            <div style={{ width: 14, height: 44, marginTop: 4, background: "#1a7f5a", borderRadius: 4 }} />
            <div style={{ width: 14, height: 34, marginTop: 10, background: "#dfff52", border: "2px solid #12211d", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>AtlasTrace</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#1a7f5a",
              textTransform: "uppercase",
            }}
          >
            Multi-Agent Agentic RAG Decision Room
          </span>
          <span style={{ fontSize: 58, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            Every recommendation shows its evidence trail.
          </span>
        </div>

        <div style={{ display: "flex", gap: 14, fontSize: 16, color: "#53615c" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#1a7f5a" }} />
            Plan
          </span>
          <span>→</span>
          <span>Retrieve</span>
          <span>→</span>
          <span>Critique</span>
          <span>→</span>
          <span>Synthesize</span>
          <span style={{ marginLeft: "auto", fontFamily: "monospace" }}>English · Tiếng Việt</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
