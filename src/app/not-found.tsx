import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--background)] px-6 text-center">
      <BrandLogo />
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-5xl">404</h1>
        <p className="text-[var(--muted)]">A página pedida não foi encontrada.</p>
      </div>
      <Link href="/">
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  );
}
