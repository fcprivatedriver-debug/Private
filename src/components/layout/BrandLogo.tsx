import { Link } from "@/i18n/navigation";
import clsx from "clsx";

export type ZrikLogoVariant = "A" | "B" | "C";

/** Default app logo until a final variant is chosen on /branding-preview. */
export const DEFAULT_ZRIK_VARIANT: ZrikLogoVariant = "A";

/**
 * Typographic ZRIK wordmark — always uppercase.
 * A: all black · B: Z blue · C: Z+K blue
 */
export function ZrikWordmark({
  variant = DEFAULT_ZRIK_VARIANT,
  className = "",
  as: Tag = "span",
}: {
  variant?: ZrikLogoVariant;
  className?: string;
  as?: "span" | "h1" | "div" | "p";
}) {
  return (
    <Tag className={clsx("zrik-wordmark", `zrik-wordmark-${variant}`, className)} aria-label="ZRIK">
      {variant === "A" && <span className="zrik-ink">ZRIK</span>}
      {variant === "B" && (
        <>
          <span className="zrik-accent">Z</span>
          <span className="zrik-ink">RIK</span>
        </>
      )}
      {variant === "C" && (
        <>
          <span className="zrik-accent">Z</span>
          <span className="zrik-ink">RI</span>
          <span className="zrik-accent">K</span>
        </>
      )}
    </Tag>
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  variant = DEFAULT_ZRIK_VARIANT,
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
  variant?: ZrikLogoVariant;
}) {
  const fontSize = size === "lg" ? "1.55rem" : size === "sm" ? "1.05rem" : "1.25rem";
  return (
    <Link href={href as "/"} className="logo" style={{ fontSize }} aria-label="ZRIK">
      <ZrikWordmark variant={variant} />
    </Link>
  );
}
