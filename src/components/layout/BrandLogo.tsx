import Link from "next/link";
import { APP_NAME, ASSISTANT_NAME, APP_SLOGAN } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Folhas — referência oficial: duas folhas teal na zona superior de KNOW
 * (acima de Know, à direita de “and”), não junto do “and”.
 */
function BrandLeaves({ className }: { className?: string }) {
  return (
    <svg
      className={cn("brand-leaves", className)}
      viewBox="0 0 40 32"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 26c3-9 9.5-15 18.5-17.5-1.5 8.5-6.5 15-15.2 18.8-.9.4-1.9-.5-1.4-1.3Z"
        fill="#3ECFBE"
      />
      <path
        d="M14 24c4-8.2 11-12.5 20-13.5-2.8 7.5-9 12.8-18.2 15.5-1 .3-1.9-.7-1.8-1.8Z"
        fill="#2BB8A8"
      />
      <path
        d="M11 16c2-7 7-11.5 14-13.5.3 6.5-3 12.2-11.5 15.8-1 .4-2-.5-1.5-1.4Z"
        fill="#5ED9CB"
      />
    </svg>
  );
}

export function BrandLogo({
  href = "/pt",
  size = "md",
  withWord = true,
  withSlogan = true,
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  /** Mantido por compatibilidade — o wordmark empilhado é sempre o logótipo. */
  withWord?: boolean;
  withSlogan?: boolean;
  className?: string;
}) {
  void withWord;

  return (
    <Link
      href={href}
      className={cn("brand-logo", `brand-logo--${size}`, className)}
      aria-label={`${APP_NAME} — ${APP_SLOGAN}. Com a ${ASSISTANT_NAME}.`}
      data-testid="brand-logo"
    >
      <span className="brand-stacked" aria-hidden>
        <span className="brand-line brand-line--add">Add</span>
        <span className="brand-line brand-line--and">and</span>
        <span className="brand-line brand-line--know">
          <BrandLeaves />
          <span className="brand-know-text">Know</span>
        </span>
        {withSlogan ? <span className="brand-slogan">{APP_SLOGAN}</span> : null}
      </span>
      <span className="sr-only">{APP_NAME}</span>
    </Link>
  );
}
