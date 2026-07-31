"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { Plan } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { resolvePlanTier } from "@/config/plans";
import { PlanCheckoutForm } from "@/components/plans/PlanCheckoutForm";

type Props = {
  plans: Plan[];
  locale?: string;
  /** When true, show checkout / diamond CTA; otherwise link to /planos */
  interactive?: boolean;
  loggedIn?: boolean;
};

export function PlanTierGrid({
  plans,
  locale = "pt",
  interactive = false,
  loggedIn = false,
}: Props) {
  const isPt = locale.startsWith("pt");

  return (
    <div className="plan-tier-grid">
      {plans.map((plan) => {
        const tier = resolvePlanTier(plan.tier);
        const features = JSON.parse(plan.featuresJson || "[]") as string[];
        const name = isPt ? plan.namePt : plan.nameEn;
        const description = isPt ? plan.descriptionPt : plan.descriptionEn;
        const cta =
          (isPt ? plan.ctaLabelPt : plan.ctaLabelEn) ||
          (plan.showPrice ? (isPt ? "Escolher plano" : "Choose plan") : isPt ? "Pedir proposta personalizada" : "Request a custom proposal");
        const accent = plan.accentColor || tier.accent;
        const isDiamond = plan.tier === "diamond" || !plan.showPrice;

        return (
          <article
            key={plan.id}
            className={`plan-tier-card plan-tier-${tier.key}${isDiamond ? " plan-tier-diamond" : ""}`}
            style={
              {
                "--plan-accent": accent,
                "--plan-soft": tier.accentSoft,
                "--plan-ink": tier.ink,
                "--plan-border": tier.border,
              } as CSSProperties
            }
          >
            <div className="plan-tier-ribbon">
              <span className="plan-tier-emoji" aria-hidden>
                {tier.emoji}
              </span>
              <span className="plan-tier-label">{isPt ? tier.labelPt : tier.labelEn}</span>
            </div>

            <h3 className="plan-tier-name">{name}</h3>

            {isDiamond ? (
              <p className="plan-tier-price plan-tier-price-custom">Proposta Personalizada</p>
            ) : (
              <p className="plan-tier-price">
                {formatMoney(plan.priceCents, "EUR", locale)}
                <span>/ mês</span>
              </p>
            )}

            {description && <p className="plan-tier-desc">{description}</p>}

            {isDiamond ? (
              <p className="plan-tier-audience">Destinado a:</p>
            ) : null}

            <ul className="plan-tier-features">
              {features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            {interactive ? (
              isDiamond ? (
                <Link href={`/${locale}/planos/diamante`} className="btn plan-tier-cta">
                  {cta}
                </Link>
              ) : loggedIn ? (
                <PlanCheckoutForm
                  planId={plan.id}
                  planName={name}
                  priceLabel={formatMoney(plan.priceCents, "EUR", locale)}
                  ctaLabel={cta}
                  accent={accent}
                />
              ) : (
                <Link href={`/${locale}/registo`} className="btn plan-tier-cta">
                  {cta}
                </Link>
              )
            ) : (
              <Link
                href={isDiamond ? `/${locale}/planos/diamante` : `/${locale}/planos`}
                className="btn plan-tier-cta"
              >
                {isDiamond ? cta : isPt ? "Ver planos" : "View plans"}
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}
