import { ImageResponse } from "next/og";
import { BRAND_INK, watchdogDataUri } from "@/lib/brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Tab favicon — the Watchdog on a dark tile. The mark alone is wider than it
 * is tall and shrinks to a sliver at 16px; the tile gives it a solid,
 * recognisable shape in light and dark tab strips alike.
 */
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
          background: BRAND_INK,
          borderRadius: 8,
        }}
      >
        <img src={watchdogDataUri()} width={28} height={28} alt="" />
      </div>
    ),
    { ...size }
  );
}
