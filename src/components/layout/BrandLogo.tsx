import { Link } from "@/i18n/navigation";

/** Hegos mark — geometric H with a forward arc (motion + trust). */
export function HegosMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="currentColor" className="hegos-mark-bg" />
      <path
        d="M9 8.5v15M23 8.5v15M9 16h14"
        stroke="#F7F8F9"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.5 7.5c3.2 2.4 4.8 5.6 4.8 8.5s-1.6 6.1-4.8 8.5"
        stroke="#5BA3C0"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.95"
      />
    </svg>
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  tone = "default",
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "on-dark";
}) {
  const mark = size === "lg" ? 34 : size === "sm" ? 22 : 28;
  const fontSize = size === "lg" ? "1.75rem" : size === "sm" ? "1.2rem" : "1.4rem";
  return (
    <Link
      href={href as "/"}
      className={`logo${tone === "on-dark" ? " logo-on-dark" : ""}`}
      style={{ fontSize }}
      aria-label="Hegos"
    >
      <HegosMark size={mark} />
      <span className="logo-word">
        Heg<span>os</span>
      </span>
    </Link>
  );
}
