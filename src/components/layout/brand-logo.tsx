import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

interface BrandLogoProps {
  className?: string;
  href?: string;
  tone?: "light" | "dark";
}

export function BrandLogo({
  className,
  href = "/",
  tone = "dark",
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-baseline gap-2 tracking-tight",
        className,
      )}
    >
      <span
        className={cn(
          "font-[family-name:var(--font-display)] text-2xl font-medium leading-none",
          tone === "dark" ? "text-[var(--foreground)]" : "text-white",
        )}
      >
        FC
      </span>
      <span
        className={cn(
          "text-xs font-medium uppercase tracking-[0.22em]",
          tone === "dark" ? "text-[var(--muted)]" : "text-white/70",
        )}
      >
        Private Driver
      </span>
      <span className="sr-only">{siteConfig.name}</span>
    </Link>
  );
}
