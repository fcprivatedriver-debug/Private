import Link from "next/link";
import clsx from "clsx";
import { BRAND_NAME } from "@/config/brand";

/** Geometric Z mark — app icon & favicon source. */
export function ZeluMark({
  className = "",
  size = 28,
  tone = "default",
}: {
  className?: string;
  size?: number;
  tone?: "default" | "on-dark" | "inverse";
}) {
  const fill = tone === "inverse" ? "#F6F7F5" : tone === "on-dark" ? "#A8C9C2" : "currentColor";
  return (
    <svg
      className={clsx("zelu-mark", className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill={tone === "inverse" ? "#1F4F46" : "none"} />
      {/* Stylized Z: top bar, diagonal, bottom bar — balanced & memorable */}
      <path
        d="M16 18.5h32c1.2 0 1.9 1.35 1.15 2.3L24.2 45.5H48c1.1 0 1.1 1.7 0 1.7H16c-1.2 0-1.9-1.35-1.15-2.3L38.8 20.2H16c-1.1 0-1.1-1.7 0-1.7Z"
        fill={fill}
      />
    </svg>
  );
}

export function ZeluWordmark({
  className = "",
  as: Tag = "span",
  tone = "default",
  showMark = false,
  markSize = 28,
}: {
  className?: string;
  as?: "span" | "h1" | "div" | "p";
  tone?: "default" | "on-dark";
  showMark?: boolean;
  markSize?: number;
}) {
  return (
    <Tag
      className={clsx("zelu-wordmark", tone === "on-dark" && "zelu-wordmark-on-dark", className)}
      aria-label={BRAND_NAME}
    >
      {showMark && <ZeluMark size={markSize} tone={tone === "on-dark" ? "on-dark" : "default"} />}
      <span className="zelu-letters">
        <span className="zelu-accent">Z</span>
        <span className="zelu-ink">ELU</span>
      </span>
    </Tag>
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  tone = "default",
  withMark = true,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "on-dark";
  withMark?: boolean;
}) {
  const fontSize = size === "lg" ? "1.45rem" : size === "sm" ? "1rem" : "1.2rem";
  const markSize = size === "lg" ? 32 : size === "sm" ? 22 : 26;
  return (
    <Link href={href} className="logo" style={{ fontSize }} aria-label={BRAND_NAME}>
      <ZeluWordmark tone={tone} showMark={withMark} markSize={markSize} />
    </Link>
  );
}
