import { Link } from "@/i18n/navigation";
import clsx from "clsx";

export type TripvoLogoVariant = "A" | "B" | "C";

/** Default: Tripv + location pin substituting the final "o". */
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
 * Location pin that visually replaces the final "o" in Tripvo.
 * Sized to sit on the baseline like a lowercase o.
 */
export function TripvoPin({
  className = "",
  size = "0.92em",
}: {
  className?: string;
  size?: number | string;
}) {
  return (
    <svg
      className={clsx("tripvo-pin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 32"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0C6.48 0 2 4.35 2 9.7c0 6.55 8.2 16.9 9.15 17.95a1.1 1.1 0 0 0 1.7 0C13.8 26.6 22 16.25 22 9.7 22 4.35 17.52 0 12 0Zm0 13.9a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Z" />
    </svg>
  );
}

/**
 * Graphic wordmark: "Tripv" + pin-as-o.
 * Title case (never CSS uppercase). aria-label stays "Tripvo".
 */
export function TripvoWordmark({
  variant = DEFAULT_TRIPVO_VARIANT,
  className = "",
  as: Tag = "span",
  tone = "default",
  showMark = false,
  markSize = 26,
  withPin = true,
}: {
  variant?: TripvoLogoVariant;
  className?: string;
  as?: "span" | "h1" | "div" | "p";
  tone?: "default" | "on-dark";
  showMark?: boolean;
  markSize?: number;
  /** When true (default), final o is the location pin. */
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
      <span className="tripvo-letters">
        <span className="tripvo-ink">
          <span className="tripvo-t">T</span>
          <span className="tripvo-rest">ripv</span>
        </span>
        {withPin ? (
          <span className="tripvo-o-pin tripvo-accent" aria-hidden>
            <TripvoPin />
          </span>
        ) : (
          <span className="tripvo-accent">o</span>
        )}
      </span>
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
  const fontSize = size === "lg" ? "1.35rem" : size === "sm" ? "0.95rem" : "1.1rem";
  const markSize = size === "lg" ? 28 : size === "sm" ? 20 : 22;
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
