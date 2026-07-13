import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch / home-screen icon — Split mark. */
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
          gap: 0,
          paddingLeft: 28,
          paddingRight: 28,
        }}
      >
        <div
          style={{
            width: 58,
            height: 96,
            borderRadius: 14,
            background: "#fff",
          }}
        />
        <div
          style={{
            width: 58,
            height: 96,
            borderRadius: 14,
            background: "rgba(255,255,255,0.28)",
            border: "5px solid #fff",
            boxSizing: "border-box",
            marginLeft: 0,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
