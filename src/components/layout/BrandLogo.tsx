import { Link } from "@/i18n/navigation";
import clsx from "clsx";

export type TripvoLogoVariant = "A" | "B" | "C";

/** Default: Option B — T in brand accent, ripvo in ink. */
export const DEFAULT_TRIPVO_VARIANT: TripvoLogoVariant = "B";

/** Geometric T mark for header / favicon companion. */
export function TripvoMark({
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
      className={clsx("tripvo-mark", className)}
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
        d="M14 18h36c1.1 0 1.1 1.7 0 1.7H33.7v26.8c0 1.1-1.7 1.1-1.7 0V19.7H14c-1.1 0-1.1-1.7 0-1.7Z"
        fill={fill}
      />
    </svg>
  );
}

/**
 * Typographic Tripvo wordmark — title case brand, display uppercase via CSS.
 */
export function TripvoWordmark({
  variant = DEFAULT_TRIPVO_VARIANT,
  className = "",
  as: Tag = "span",
  tone = "default",
  showMark = false,
  markSize = 26,
}: {
  variant?: TripvoLogoVariant;
  className?: string;
  as?: "span" | "h1" | "div" | "p";
  tone?: "default" | "on-dark";
  showMark?: boolean;
  markSize?: number;
}) {
  return (
    <Tag
      className={clsx(
        "tripvo-wordmark",
        `tripvo-wordmark-${variant}`,
        tone === "on-dark" && "tripvo-wordmark-on-dark",
        className,
      )}
      aria-label="Tripvo"
    >
      {showMark && (
        <TripvoMark size={markSize} tone={tone === "on-dark" ? "on-dark" : "default"} />
      )}
      {variant === "A" && <span className="tripvo-ink">Tripvo</span>}
      {variant === "B" && (
        <span className="tripvo-letters">
          <span className="tripvo-accent">T</span>
          <span className="tripvo-ink">ripvo</span>
        </span>
      )}
      {variant === "C" && (
        <span className="tripvo-letters">
          <span className="tripvo-accent">T</span>
          <span className="tripvo-ink">ripv</span>
          <span className="tripvo-accent">o</span>
        </span>
      )}
    </Tag>
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  variant = DEFAULT_TRIPVO_VARIANT,
  tone = "default",
  withMark = true,
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
  variant?: TripvoLogoVariant;
  tone?: "default" | "on-dark";
  withMark?: boolean;
}) {
  const fontSize = size === "lg" ? "1.45rem" : size === "sm" ? "1rem" : "1.2rem";
  const markSize = size === "lg" ? 30 : size === "sm" ? 22 : 26;
  return (
    <Link href={href as "/"} className="logo" style={{ fontSize }} aria-label="Tripvo">
      <TripvoWordmark variant={variant} tone={tone} showMark={withMark} markSize={markSize} />
    </Link>
  );
}

/** @deprecated Use TripvoWordmark */
export const ZeluWordmark = TripvoWordmark;
/** @deprecated Use TripvoMark */
export const ZeluMark = TripvoMark;
/** @deprecated Use TripvoWordmark */
export const ZrikWordmark = TripvoWordmark;
/** @deprecated Use DEFAULT_TRIPVO_VARIANT */
export const DEFAULT_ZELU_VARIANT = DEFAULT_TRIPVO_VARIANT;
/** @deprecated Use DEFAULT_TRIPVO_VARIANT */
export const DEFAULT_ZRIK_VARIANT = DEFAULT_TRIPVO_VARIANT;
export type ZeluLogoVariant = TripvoLogoVariant;
