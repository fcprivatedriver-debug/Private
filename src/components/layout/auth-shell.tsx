import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[var(--ink)] lg:block">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 20% 20%, rgba(212,175,122,0.35), transparent 45%), radial-gradient(ellipse at 80% 80%, rgba(90,120,140,0.25), transparent 50%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <BrandLogo tone="light" />
          <div className="max-w-md space-y-4">
            <p className="font-[family-name:var(--font-display)] text-4xl leading-tight">
              Viagens privadas, propostas transparentes.
            </p>
            <p className="text-sm leading-relaxed text-white/70">
              A FC Private Driver liga clientes e motoristas profissionais numa
              plataforma desenhada para confiança e controlo.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Marketplace de motoristas privados
          </p>
        </div>
      </div>

      <div className="flex flex-col bg-[var(--background)]">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <BrandLogo />
          <Link
            href="/"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Início
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-sm text-[var(--muted)]">{subtitle}</p>
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
