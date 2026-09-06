import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#12211d",
          borderRadius: 6,
        }}
      >
        <div style={{ display: "flex", gap: 2, transform: "rotate(-11deg)" }}>
          <div style={{ width: 6, height: 12, marginTop: 8, background: "#fbfcf8", borderRadius: 2 }} />
          <div style={{ width: 6, height: 20, marginTop: 2, background: "#1a7f5a", borderRadius: 2 }} />
          <div style={{ width: 6, height: 15, marginTop: 5, background: "#dfff52", borderRadius: 2 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
