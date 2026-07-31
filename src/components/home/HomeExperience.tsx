"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ZeluWordmark } from "@/components/layout/BrandLogo";
import { PRODUCTION_HERO, PRODUCTION_OVERLAY } from "@/config/brand";

export type HomeSession = {
  signedIn: boolean;
  hasCustomer: boolean;
  hasDriver: boolean;
  activeMode: "CUSTOMER" | "DRIVER" | null;
  isAdmin: boolean;
};

type Tab = "customer" | "driver";

const VALUES = [
  "Profissionalismo",
  "Responsabilidade",
  "Educação",
  "Disponibilidade",
  "Empatia",
  "Excelência",
] as const;

const CUSTOMER_STEPS = [
  "Indique origem e destino",
  "Receba propostas",
  "Compare motoristas",
  "Escolha quem prefere",
  "Viaje com segurança",
] as const;

const DRIVER_STEPS = [
  "Criar conta",
  "Enviar documentos",
  "Validação",
  "Começar a receber pedidos",
] as const;

export function HomeExperience({ session }: { session: HomeSession }) {
  const [tab, setTab] = useState<Tab>("customer");

  const requestHref = session.signedIn && session.hasCustomer
    ? "/pedidos/novo"
    : "/registo?role=CUSTOMER";

  const driveHref = session.signedIn && session.hasDriver
    ? session.activeMode === "DRIVER"
      ? "/onboarding"
      : "/onboarding"
    : session.signedIn && session.hasCustomer && !session.hasDriver
      ? "/tornar-motorista"
      : "/registo?role=DRIVER";

  return (
    <>
      <section
        className="hero hero-scene"
        style={{ ["--hero-overlay" as string]: String(PRODUCTION_OVERLAY) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PRODUCTION_HERO}
          alt=""
          className="hero-scene-photo"
          fetchPriority="high"
        />
        <div className="hero-scene-veil" aria-hidden />
        <div className="container hero-scene-content">
          <h1 className="hero-brand fade-up">
            <ZeluWordmark as="span" variant="B" showMark markSize={48} />
          </h1>

          <div
            className="home-tabs fade-up"
            role="tablist"
            aria-label="Escolher experiência"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "customer"}
              className={tab === "customer" ? "home-tab is-active" : "home-tab"}
              onClick={() => setTab("customer")}
            >
              Cliente
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "driver"}
              className={tab === "driver" ? "home-tab is-active" : "home-tab"}
              onClick={() => setTab("driver")}
            >
              Motorista
            </button>
          </div>

          {tab === "customer" ? (
            <div className="home-tab-panel fade-up-delay" role="tabpanel">
              <p className="hero-copy">
                <span className="hero-copy-line">Peça a sua viagem.</span>
              </p>
              <p className="home-lead">
                Receba propostas de motoristas verificados e escolha o melhor
                serviço para si.
              </p>
              <div className="cta-row">
                <Link href={requestHref} className="btn btn-primary btn-hero">
                  Pedir viagem
                </Link>
                {!session.signedIn ? (
                  <Link href="/login" className="btn btn-secondary btn-hero-ghost">
                    Entrar
                  </Link>
                ) : (
                  <Link href="/pedidos" className="btn btn-secondary btn-hero-ghost">
                    As minhas viagens
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="home-tab-panel fade-up-delay" role="tabpanel">
              <p className="hero-copy">
                <span className="hero-copy-line">Conduza com a ZELU.</span>
              </p>
              <p className="home-lead">
                Junte-se a uma rede de motoristas verificados. Envie os
                documentos, passe a validação e comece a receber pedidos.
              </p>
              <div className="cta-row">
                <Link href={driveHref} className="btn btn-primary btn-hero">
                  Quero ser motorista
                </Link>
                {!session.signedIn ? (
                  <Link href="/login" className="btn btn-secondary btn-hero-ghost">
                    Entrar
                  </Link>
                ) : (
                  <Link href="/painel" className="btn btn-secondary btn-hero-ghost">
                    Abrir painel
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section section-premium">
        <div className="container">
          {tab === "customer" ? (
            <>
              <div className="section-premium-head">
                <h2>Como funciona</h2>
                <p className="lead">
                  Do pedido à chegada — com controlo total sobre quem o conduz.
                </p>
              </div>
              <div className="steps steps-premium steps-five">
                {CUSTOMER_STEPS.map((label, i) => (
                  <div key={label}>
                    <div className="step-num">{String(i + 1).padStart(2, "0")}</div>
                    <h3>{label}</h3>
                  </div>
                ))}
              </div>
              <div className="brand-values">
                <h2>Os nossos valores</h2>
                <ul className="brand-values-list">
                  {VALUES.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="section-premium-head">
                <h2>Como começar a conduzir</h2>
                <p className="lead">
                  Quatro passos até estar pronto para receber pedidos ZELU.
                </p>
              </div>
              <div className="steps steps-premium">
                {DRIVER_STEPS.map((label, i) => (
                  <div key={label}>
                    <div className="step-num">{String(i + 1).padStart(2, "0")}</div>
                    <h3>{label}</h3>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
