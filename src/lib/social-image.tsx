import { ImageResponse } from "next/og";

export const SOCIAL_IMAGE_ALT =
  "APIDiffGuard — Catch breaking API changes before production";
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };
export const SOCIAL_IMAGE_TYPE = "image/png";

/** Shared Open Graph / Twitter card artwork. */
export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          background: "#09090b",
          overflow: "hidden",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(79,127,255,0.35) 0%, rgba(79,127,255,0) 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -100,
            width: 480,
            height: 480,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(34,197,94,0.16) 0%, rgba(34,197,94,0) 70%)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "56px 64px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#4F7FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 28,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.95)",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 28,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.35)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                color: "#fafafa",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: -0.4,
              }}
            >
              APIDiffGuard
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 40,
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                maxWidth: 640,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 58,
                  fontWeight: 700,
                  color: "#fafafa",
                  lineHeight: 1.08,
                  letterSpacing: -1.2,
                }}
              >
                Catch breaking API changes before production
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: "#a1a1aa",
                  lineHeight: 1.35,
                  maxWidth: 560,
                }}
              >
                Baselines · schema drift diffs · scheduled checks · Slack alerts
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 380,
                borderRadius: 16,
                border: "1px solid #27272a",
                background: "rgba(24,24,27,0.92)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderBottom: "1px solid #27272a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#fafafa",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Response diff
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#f87171",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  2 breaking
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "16px 18px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 15,
                }}
              >
                <div style={{ display: "flex", color: "#f87171" }}>
                  − data.pagination.per_page
                </div>
                <div style={{ display: "flex", color: "#fbbf24" }}>
                  ~ data.role : string → number
                </div>
                <div style={{ display: "flex", color: "#a1a1aa" }}>
                  + data.meta.request_id
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", color: "#4F7FFF", fontSize: 22 }}>
              apidiffguard.com
            </div>
            <div style={{ display: "flex", color: "#71717a", fontSize: 18 }}>
              Free JSON Diff · Open core
            </div>
          </div>
        </div>
      </div>
    ),
    { ...SOCIAL_IMAGE_SIZE }
  );
}
