import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Generated social share image (og:image / twitter:image) for the whole app.
export const alt = "SG Thali — QR ordering for modern restaurants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const markData = await readFile(
    join(process.cwd(), "public/landing/sg-thali-mark.png"),
  );
  const markSrc = `data:image/png;base64,${markData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 82% 18%, rgba(245,158,11,0.28), transparent 42%), radial-gradient(circle at 12% 95%, rgba(244,63,94,0.18), transparent 45%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 9999,
              overflow: "hidden",
              backgroundColor: "#09090b",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={markSrc}
              alt=""
              width={64}
              height={64}
              style={{ width: 64, height: 64, objectFit: "contain" }}
            />
          </div>
          <span style={{ fontSize: 40, fontWeight: 700 }}>SG Thali</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Turn every table into a self-serve ordering counter.
          </span>
          <span style={{ fontSize: 32, color: "#a1a1aa", maxWidth: 820 }}>
            Guests scan a QR, order in seconds, and every ticket lands live on
            your dashboard.
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            color: "#71717a",
          }}
        >
          <span style={{ color: "#f59e0b", fontWeight: 600 }}>sgthali.app</span>
          <span>·</span>
          <span>QR ordering for modern restaurants</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
