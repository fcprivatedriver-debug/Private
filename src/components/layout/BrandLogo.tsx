import { Link } from "@/i18n/navigation";
import clsx from "clsx";

export type TripvoLogoVariant = "A" | "B" | "C";

/** Default: Option B — Trip in ink, vo + pin in petrol accent. */
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

/** Location pin integrated into the final letter of the wordmark. */
export function TripvoPin({
  className = "",
  size = "1.05em",
}: {
  className?: string;
  size?: number | string;
}) {
  return (
    <svg
      className={clsx("tripvo-pin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.4c-3.7 0-6.7 2.9-6.7 6.6 0 4.6 5.4 10.7 6.2 11.5a.7.7 0 0 0 1 0c.8-.8 6.2-6.9 6.2-11.5 0-3.7-3-6.6-6.7-6.6Zm0 9.1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

/**
 * Typographic Tripvo wordmark — title case brand, display uppercase via CSS.
 * Keep letters in one inline text run so kerning stays intact.
 */
export function TripvoWordmark({
  variant = DEFAULT_TRIPVO_VARIANT,
  className = "",
  as: Tag = "span",
  tone = "default",
  showMark = false,
  markSize = 26,
  withPin = false,
}: {
  variant?: TripvoLogoVariant;
  className?: string;
  as?: "span" | "h1" | "div" | "p";
  tone?: "default" | "on-dark";
  showMark?: boolean;
  markSize?: number;
  withPin?: boolean;
}) {
  return (
    <Tag
      className={clsx(
        "tripvo-wordmark",
        `tripvo-wordmark-${variant}`,
        tone === "on-dark" && "tripvo-wordmark-on-dark",
        withPin && "tripvo-wordmark-pin",
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
          <span className="tripvo-ink">Trip</span>
          <span className="tripvo-accent">
            vo
            {withPin && <TripvoPin />}
          </span>
        </span>
      )}
      {variant === "C" && (
        <span className="tripvo-letters tripvo-ink">
          <span className="tripvo-accent">T</span>ripv
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
  withMark = false,
  withTagline = false,
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
  variant?: TripvoLogoVariant;
  tone?: "default" | "on-dark";
  withMark?: boolean;
  withTagline?: boolean;
}) {
  const fontSize = size === "lg" ? "1.45rem" : size === "sm" ? "1rem" : "1.15rem";
  const markSize = size === "lg" ? 30 : size === "sm" ? 22 : 24;
  return (
    <Link
      href={href as "/"}
      className={clsx("logo", withTagline && "logo-with-tagline")}
      style={{ fontSize }}
      aria-label="Tripvo — Travel your way"
    >
      <TripvoWordmark
        variant={variant}
        tone={tone}
        showMark={withMark}
        markSize={markSize}
        withPin
      />
      {withTagline && <span className="logo-tagline">Travel your way</span>}
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
