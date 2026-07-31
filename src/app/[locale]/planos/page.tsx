import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import { PlanCheckoutForm } from "@/components/plans/PlanCheckoutForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function PlanosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("plans");
  const isPt = locale.startsWith("pt");

  const [plans, session] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    auth(),
  ]);

  return (
    <section className="section fade-up">
      <div className="container">
        <div className="section-head">
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lead">{t("lead")}</p>
        </div>

        <div className="card-soft" style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>{t("rulesTitle")}</h2>
          <ul className="advantages" style={{ margin: 0 }}>
            <li>{t("rule1")}</li>
            <li>{t("rule2")}</li>
            <li>{t("rule3")}</li>
            <li>{t("rule4")}</li>
            <li>{t("rule5")}</li>
          </ul>
        </div>

        {!session?.user && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            {t("loginRequired")}{" "}
            <Link href="/login" style={{ textDecoration: "underline" }}>
              {t("loginLink")}
            </Link>
          </div>
        )}

        <div className="steps">
          {plans.map((plan, i) => {
            const features = JSON.parse(plan.featuresJson || "[]") as string[];
            const name = isPt ? plan.namePt : plan.nameEn;
            const description = isPt ? plan.descriptionPt : plan.descriptionEn;
            const price = formatMoney(plan.priceCents, "EUR", locale);

            return (
              <article
                key={plan.id}
                className={`card-soft plan-card${i === 1 ? " plan-card-featured" : ""}`}
              >
                <div>
                  <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.35rem" }}>{name}</h2>
                  {description && <p className="muted" style={{ margin: 0 }}>{description}</p>}
                </div>
                <p className="plan-price" style={{ margin: 0 }}>
                  {price}
                  <span style={{ fontSize: "0.9rem", color: "var(--fg-muted)" }}>/mês</span>
                </p>
                <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                  {plan.monthlyMinutes} min/mês
                  {plan.equivalentHours ? ` · ~${plan.equivalentHours}h` : ""}
                </p>
                <ul className="plan-features">
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {session?.user ? (
                  <PlanCheckoutForm planId={plan.id} planName={name} priceLabel={price} />
                ) : (
                  <Link href="/registo" className="btn btn-primary">
                    {t("createAccount")}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
