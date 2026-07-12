import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "APIDiffGuard — Catch breaking API changes before production";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "#fafafa",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: "#4F7FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            A
          </div>
          APIDiffGuard
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#fafafa",
              lineHeight: 1.1,
              maxWidth: 980,
            }}
          >
            Catch breaking API changes before production
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa", maxWidth: 900 }}>
            Schema drift detection · JSON Diff · CI gates · Open source
          </div>
        </div>
        <div style={{ display: "flex", color: "#4F7FFF", fontSize: 22 }}>
          apidiffguard.com
        </div>
      </div>
    ),
    { ...size }
  );
}
