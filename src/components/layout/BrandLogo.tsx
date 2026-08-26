import Image from "next/image";
import { Link } from "@/i18n/navigation";
import clsx from "clsx";
import { BRAND } from "@/config/brand";

export function BrandLogo({
  href = "/",
  size = "md",
  tone = "default",
  showText = true,
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "on-dark";
  showText?: boolean;
}) {
  const fontSize = size === "lg" ? "1.35rem" : size === "sm" ? "0.95rem" : "1.1rem";
  const imgSize = size === "lg" ? 36 : size === "sm" ? 24 : 30;

  return (
    <Link
      href={href as "/"}
      className={clsx("brand-logo", tone === "on-dark" && "brand-logo-on-dark")}
      style={{ fontSize }}
      aria-label={BRAND.name}
    >
      <Image
        src={tone === "on-dark" ? BRAND.logoLight : BRAND.logo}
        alt=""
        width={imgSize}
        height={imgSize}
        priority
      />
      {showText && <span>FC Private Driver</span>}
    </Link>
  );
}
