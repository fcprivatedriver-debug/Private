import Link from "next/link";
import { APP_NAME, ASSISTANT_NAME, APP_SLOGAN } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Folhas do logótipo — referência visual exacta do mockup. */
function BrandLeaves({ className }: { className?: string }) {
  return (
    <svg
      className={cn("brand-leaves", className)}
      viewBox="0 0 36 28"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 22c2.2-7.5 7.2-12.2 14.5-14.2-1.1 6.8-5.2 12.2-12.2 15.4-.8.4-1.7-.4-1.3-1.2Z"
        fill="#3ECFBE"
      />
      <path
        d="M14 20c3.4-6.8 9.2-10.4 16.8-11.2-2.4 6.2-7.4 10.6-15.2 12.8-.9.3-1.7-.6-1.6-1.6Z"
        fill="#2BB8A8"
      />
      <path
        d="M12 14c1.6-5.8 5.8-9.6 11.8-11.4.2 5.4-2.6 10.2-9.6 13.2-.9.4-1.8-.4-1.4-1.2Z"
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
    >
      <span className="brand-stacked" aria-hidden>
        <span className="brand-line brand-line--add">Add</span>
        <span className="brand-line brand-line--and">
          <span className="brand-and-text">and</span>
          <BrandLeaves />
        </span>
        <span className="brand-line brand-line--know">Know</span>
        {withSlogan ? <span className="brand-slogan">{APP_SLOGAN}</span> : null}
      </span>
      <span className="sr-only">{APP_NAME}</span>
    </Link>
  );
}
