import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/pt",
  size = "md",
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Link href={href} className={cn("brand-logo", className)} aria-label="Mel">
      <span className="brand-mark" aria-hidden>
        M
      </span>
      <span
        className="brand-word"
        style={{ fontSize: size === "lg" ? "1.7rem" : size === "sm" ? "1.15rem" : undefined }}
      >
        Mel
      </span>
    </Link>
  );
}
