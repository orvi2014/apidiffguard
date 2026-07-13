import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch / home-screen icon. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F7FFF",
          borderRadius: 40,
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 96,
              borderRadius: 10,
              background: "rgba(255,255,255,0.95)",
            }}
          />
          <div
            style={{
              width: 42,
              height: 96,
              borderRadius: 10,
              background: "rgba(255,255,255,0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 10,
              paddingLeft: 8,
            }}
          >
            <div
              style={{
                width: 24,
                height: 8,
                borderRadius: 4,
                background: "#fff",
              }}
            />
            <div
              style={{
                width: 24,
                height: 8,
                borderRadius: 4,
                background: "rgba(255,255,255,0.7)",
              }}
            />
            <div
              style={{
                width: 16,
                height: 8,
                borderRadius: 4,
                background: "rgba(255,255,255,0.45)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
