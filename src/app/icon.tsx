import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Tab favicon — diff-pane mark on accent tile. */
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
          background: "#4F7FFF",
          borderRadius: 7,
        }}
      >
        <div style={{ display: "flex", gap: 3 }}>
          <div
            style={{
              width: 8,
              height: 18,
              borderRadius: 2,
              background: "rgba(255,255,255,0.95)",
            }}
          />
          <div
            style={{
              width: 8,
              height: 18,
              borderRadius: 2,
              background: "rgba(255,255,255,0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 2,
              paddingLeft: 1.5,
            }}
          >
            <div
              style={{
                width: 5,
                height: 2,
                borderRadius: 1,
                background: "#fff",
              }}
            />
            <div
              style={{
                width: 5,
                height: 2,
                borderRadius: 1,
                background: "rgba(255,255,255,0.7)",
              }}
            />
            <div
              style={{
                width: 3,
                height: 2,
                borderRadius: 1,
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
