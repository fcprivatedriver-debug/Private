import Link from "next/link";
import { APP_NAME, ASSISTANT_NAME } from "@/config/brand";

export function BrandLogo({
  href = "/pt",
  size = "md",
  withWord = true,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  withWord?: boolean;
}) {
  const sizes = {
    sm: { mark: 30, text: "1.05rem" },
    md: { mark: 38, text: "1.35rem" },
    lg: { mark: 56, text: "1.85rem" },
  }[size];

  return (
    <Link
      href={href}
      className="brand-logo"
      aria-label={`${APP_NAME} — com a ${ASSISTANT_NAME}, a tua assistente inteligente`}
    >
      <span className="brand-mark" style={{ width: sizes.mark, height: sizes.mark }} aria-hidden>
        <svg viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="currentColor" />
          <circle cx="20" cy="16" r="6" fill="#fff" fillOpacity="0.95" />
          <path
            d="M10 30c1.8-5.2 5.4-8 10-8s8.2 2.8 10 8"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
      {withWord ? (
        <span className="brand-word" style={{ fontSize: sizes.text }}>
          {APP_NAME}
        </span>
      ) : null}
    </Link>
  );
}
