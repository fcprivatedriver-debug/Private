import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { marketingNav } from "@/config/navigation";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-[var(--ink)]/70 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between">
        <BrandLogo tone="light" />
        <nav className="hidden items-center gap-8 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-white/75 transition-colors hover:text-white"
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Entrar
            </Button>
          </Link>
          <Link href="/registo">
            <Button>Criar conta</Button>
          </Link>
        </div>
      </Container>
    </header>
  );
}
