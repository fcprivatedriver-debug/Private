"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { TripvoWordmark } from "@/components/layout/BrandLogo";
import { PRODUCTION_HERO, PRODUCTION_OVERLAY } from "@/config/brand";

export type HomeSession = {
  signedIn: boolean;
  hasCustomer: boolean;
  hasDriver: boolean;
  activeMode: "CUSTOMER" | "DRIVER" | null;
  isAdmin: boolean;
};

type Tab = "customer" | "driver";

const TRUST = [
  { title: "Segurança", line: "verificada", icon: "shield" },
  { title: "Conforto", line: "sempre", icon: "seat" },
  { title: "Para qualquer", line: "ocasião", icon: "calendar" },
  { title: "Em Portugal", line: "e Espanha", icon: "map" },
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

function TrustIcon({ kind }: { kind: (typeof TRUST)[number]["icon"] }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9.5 12.2l1.8 1.8 3.4-3.6" />
      </svg>
    );
  }
  if (kind === "seat") {
    return (
      <svg {...common}>
        <path d="M6 14v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2" />
        <path d="M5 14h14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3z" />
        <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h0A1.5 1.5 0 0 1 12 6.5V8" />
      </svg>
    );
  }
  if (kind === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 21s-6-4.5-6-10a6 6 0 1 1 12 0c0 5.5-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

export function HomeExperience({ session }: { session: HomeSession }) {
  const [tab, setTab] = useState<Tab>("customer");

  const requestHref =
    session.signedIn && session.hasCustomer
      ? "/pedidos/novo"
      : "/registo?role=CUSTOMER";

  const driveHref =
    session.signedIn && session.hasDriver
      ? "/onboarding"
      : session.signedIn && session.hasCustomer && !session.hasDriver
        ? "/tornar-motorista"
        : "/registo?role=DRIVER";

  return (
    <>
      <section
        className="hero hero-scene hero-tripvo"
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
          <p className="hero-kicker fade-up">
            Transferes · Viagens · À sua medida
          </p>

          <h1 className="hero-brand fade-up">
            <TripvoWordmark as="span" variant="B" showMark={false} withPin />
          </h1>

          <p className="hero-tagline fade-up">Travel your way</p>

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
                Receba propostas de motoristas verificados
                <br />e escolha o melhor serviço para si.
              </p>
              <div className="cta-row cta-row-hero">
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
                <span className="hero-copy-line">Conduza com a Tripvo.</span>
              </p>
              <p className="home-lead">
                Junte-se a uma rede de motoristas verificados. Envie os
                documentos, passe a validação e comece a receber pedidos.
              </p>
              <div className="cta-row cta-row-hero">
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

          <ul className="trust-strip fade-up-delay" aria-label="Porquê Tripvo">
            {TRUST.map((item) => (
              <li key={item.title} className="trust-item">
                <span className="trust-icon">
                  <TrustIcon kind={item.icon} />
                </span>
                <span className="trust-text">
                  <strong>{item.title}</strong>
                  <span>{item.line}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="hero-footer-line fade-up-delay">
            Mais do que viagens
            <span>Liga pessoas a destinos</span>
          </p>
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
            </>
          ) : (
            <>
              <div className="section-premium-head">
                <h2>Como começar a conduzir</h2>
                <p className="lead">
                  Quatro passos até estar pronto para receber pedidos Tripvo.
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
