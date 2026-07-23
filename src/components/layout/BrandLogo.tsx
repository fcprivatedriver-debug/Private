import Link from "next/link";

export function BrandLogo({
  href = "/pt",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { mark: 28, text: "1.05rem" },
    md: { mark: 36, text: "1.35rem" },
    lg: { mark: 52, text: "1.85rem" },
  }[size];

  return (
    <Link href={href} className="brand-logo" aria-label="MAFIL — Gestão Financeira Familiar">
      <span className="brand-mark" style={{ width: sizes.mark, height: sizes.mark }} aria-hidden>
        <svg viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="currentColor" />
          <path
            d="M10 26V14h4.2l3.3 7.8L21 14H25v12h-3.1v-7.1L18.2 26h-2.9l-3.2-7.1V26H10zm16.5 0v-3.2h3.4V14H34v12h-7.5z"
            fill="#fff"
          />
        </svg>
      </span>
      <span className="brand-word" style={{ fontSize: sizes.text }}>
        MAFIL
      </span>
    </Link>
  );
}
