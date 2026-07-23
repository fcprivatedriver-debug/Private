import { Link } from "@/i18n/navigation";

export function BrandLogo({
  href = "/",
  size = "md",
}: {
  href?: "/" | string;
  size?: "sm" | "md" | "lg";
}) {
  const fontSize = size === "lg" ? "1.85rem" : size === "sm" ? "1.25rem" : "1.55rem";
  return (
    <Link href={href as "/"} className="logo" style={{ fontSize }}>
      <span className="logo-mark" aria-hidden />
      Mov<span>io</span>
    </Link>
  );
}
