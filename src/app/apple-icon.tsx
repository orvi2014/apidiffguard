import { ImageResponse } from "next/og";
import { BRAND_INK, watchdogDataUri } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch / home-screen icon — the Watchdog on an opaque dark tile. iOS
 * applies its own corner mask, so the tile is square and full-bleed.
 */
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
          background: BRAND_INK,
        }}
      >
        <img src={watchdogDataUri()} width={148} height={148} alt="" />
      </div>
    ),
    { ...size }
  );
}
