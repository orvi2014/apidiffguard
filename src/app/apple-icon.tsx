import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon / home-screen mark. */
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
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -2,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
