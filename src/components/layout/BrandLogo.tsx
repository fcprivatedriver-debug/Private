import { Link } from "@/i18n/navigation";
import clsx from "clsx";

export type ZrikLogoVariant = "A" | "B" | "C";

/**
 * Default product logo: Option B — Z in premium blue signals
 * technology; RIK in black signals trust and exclusivity.
 */
export const DEFAULT_ZRIK_VARIANT: ZrikLogoVariant = "B";

/**
 * Typographic ZRIK wordmark — always uppercase.
 * A: all black · B: Z blue · C: Z+K blue
 */
export function ZrikWordmark({
  variant = DEFAULT_ZRIK_VARIANT,
  className = "",
  as: Tag = "span",
  tone = "default",
}: {
  variant?: ZrikLogoVariant;
  className?: string;
  as?: "span" | "h1" | "div" | "p";
  tone?: "default" | "on-dark";
}) {
  return (
    <Tag
      className={clsx(
        "zrik-wordmark",
        `zrik-wordmark-${variant}`,
        tone === "on-dark" && "zrik-wordmark-on-dark",
        className,
      )}
      aria-label="ZRIK"
    >
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
  tone = "default",
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
  variant?: ZrikLogoVariant;
  tone?: "default" | "on-dark";
}) {
  const fontSize = size === "lg" ? "1.45rem" : size === "sm" ? "1rem" : "1.2rem";
  return (
    <Link href={href as "/"} className="logo" style={{ fontSize }} aria-label="ZRIK">
      <ZrikWordmark variant={variant} tone={tone} />
    </Link>
  );
}
