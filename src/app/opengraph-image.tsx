import { ImageResponse } from "next/og";
import { BRAND_META, BRAND_NAME, BRAND_TAGLINE_PT } from "@/config/brand";

export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE_PT.full}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(145deg, #F6F7F5 0%, #E7F0ED 55%, #D5E4E0 100%)",
          color: "#14181C",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#1F4F46",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
              <path
                d="M16 18.5h32c1.2 0 1.9 1.35 1.15 2.3L24.2 45.5H48c1.1 0 1.1 1.7 0 1.7H16c-1.2 0-1.9-1.35-1.15-2.3L38.8 20.2H16c-1.1 0-1.1-1.7 0-1.7Z"
                fill="#F6F7F5"
              />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, letterSpacing: -2 }}>
            <span style={{ color: "#1F4F46" }}>Z</span>
            <span>ELU</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 600, letterSpacing: -1, maxWidth: 800 }}>
            {BRAND_TAGLINE_PT.full}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#5A6460", maxWidth: 820 }}>
            {BRAND_META.description}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
