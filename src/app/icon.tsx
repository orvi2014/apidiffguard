import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Tab favicon — Split mark (before/after panes) on accent tile. */
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
          borderRadius: 8,
          gap: 0,
          paddingLeft: 5,
          paddingRight: 5,
        }}
      >
        <div
          style={{
            width: 11,
            height: 18,
            borderRadius: 2.5,
            background: "#fff",
          }}
        />
        <div
          style={{
            width: 11,
            height: 18,
            borderRadius: 2.5,
            background: "rgba(255,255,255,0.28)",
            border: "1.75px solid #fff",
            marginLeft: 0,
            boxSizing: "border-box",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
