import Link from "next/link";

export function BrandLogo({
  href = "/pt",
  size = "md",
  withWord = true,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  withWord?: boolean;
}) {
  const sizes = {
    sm: { mark: 30, text: "1.15rem" },
    md: { mark: 38, text: "1.45rem" },
    lg: { mark: 56, text: "2rem" },
  }[size];

  return (
    <Link href={href} className="brand-logo" aria-label="Nina — assistente financeira pessoal">
      <span className="brand-mark" style={{ width: sizes.mark, height: sizes.mark }} aria-hidden>
        <svg viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="currentColor" />
          <circle cx="20" cy="16" r="6" fill="#fff" fillOpacity="0.95" />
          <path
            d="M10 30c1.8-5.2 5.4-8 10-8s8.2 2.8 10 8"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
      {withWord ? (
        <span className="brand-word" style={{ fontSize: sizes.text }}>
          Nina
        </span>
      ) : null}
    </Link>
  );
}
