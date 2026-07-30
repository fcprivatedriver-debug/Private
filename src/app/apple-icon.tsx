import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — ZELU Z mark. */
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
          background: "#1F4F46",
          borderRadius: 36,
        }}
      >
        <svg width="110" height="110" viewBox="0 0 64 64" fill="none">
          <path
            d="M16 18.5h32c1.2 0 1.9 1.35 1.15 2.3L24.2 45.5H48c1.1 0 1.1 1.7 0 1.7H16c-1.2 0-1.9-1.35-1.15-2.3L38.8 20.2H16c-1.1 0-1.1-1.7 0-1.7Z"
            fill="#F6F7F5"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
