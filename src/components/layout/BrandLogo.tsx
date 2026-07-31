import { Link } from "@/i18n/navigation";
import clsx from "clsx";

export type ZeluLogoVariant = "A" | "B" | "C";

/** Default: Option B — Z in brand accent, ELU in ink. */
export const DEFAULT_ZELU_VARIANT: ZeluLogoVariant = "B";

/** Geometric Z mark for header / favicon companion. */
export function ZeluMark({
  className = "",
  size = 28,
  tone = "default",
}: {
  className?: string;
  size?: number;
  tone?: "default" | "on-dark" | "inverse";
}) {
  const fill =
    tone === "inverse" ? "#F6F7F5" : tone === "on-dark" ? "#A8C9C2" : "currentColor";
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
      <rect
        width="64"
        height="64"
        rx="14"
        fill={tone === "inverse" ? "#1F4F46" : "none"}
      />
      <path
        d="M16 18.5h32c1.2 0 1.9 1.35 1.15 2.3L24.2 45.5H48c1.1 0 1.1 1.7 0 1.7H16c-1.2 0-1.9-1.35-1.15-2.3L38.8 20.2H16c-1.1 0-1.1-1.7 0-1.7Z"
        fill={fill}
      />
    </svg>
  );
}

/**
 * Typographic ZELU wordmark — always uppercase.
 * A: all ink · B: Z accent + ELU ink · C: Z+U accent
 */
export function ZeluWordmark({
  variant = DEFAULT_ZELU_VARIANT,
  className = "",
  as: Tag = "span",
  tone = "default",
  showMark = false,
  markSize = 26,
}: {
  variant?: ZeluLogoVariant;
  className?: string;
  as?: "span" | "h1" | "div" | "p";
  tone?: "default" | "on-dark";
  showMark?: boolean;
  markSize?: number;
}) {
  return (
    <Tag
      className={clsx(
        "zelu-wordmark",
        `zelu-wordmark-${variant}`,
        tone === "on-dark" && "zelu-wordmark-on-dark",
        className,
      )}
      aria-label="ZELU"
    >
      {showMark && (
        <ZeluMark size={markSize} tone={tone === "on-dark" ? "on-dark" : "default"} />
      )}
      {variant === "A" && <span className="zelu-ink">ZELU</span>}
      {variant === "B" && (
        <span className="zelu-letters">
          <span className="zelu-accent">Z</span>
          <span className="zelu-ink">ELU</span>
        </span>
      )}
      {variant === "C" && (
        <span className="zelu-letters">
          <span className="zelu-accent">Z</span>
          <span className="zelu-ink">EL</span>
          <span className="zelu-accent">U</span>
        </span>
      )}
    </Tag>
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  variant = DEFAULT_ZELU_VARIANT,
  tone = "default",
  withMark = true,
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
  variant?: ZeluLogoVariant;
  tone?: "default" | "on-dark";
  withMark?: boolean;
}) {
  const fontSize = size === "lg" ? "1.45rem" : size === "sm" ? "1rem" : "1.2rem";
  const markSize = size === "lg" ? 30 : size === "sm" ? 22 : 26;
  return (
    <Link href={href as "/"} className="logo" style={{ fontSize }} aria-label="ZELU">
      <ZeluWordmark variant={variant} tone={tone} showMark={withMark} markSize={markSize} />
    </Link>
  );
}

/** @deprecated Use ZeluWordmark */
export const ZrikWordmark = ZeluWordmark;
/** @deprecated Use DEFAULT_ZELU_VARIANT */
/** @deprecated alias — use DEFAULT_ZELU_VARIANT */
export const DEFAULT_ZRIK_VARIANT = DEFAULT_ZELU_VARIANT;
