import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { PlanTierGrid } from "@/components/plans/PlanTierGrid";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function PlanosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("plans");

  const [plans, session] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true, isPersonalized: false },
      orderBy: { sortOrder: "asc" },
    }),
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
            </Link>{" "}
            para aderir aos planos Bronze, Prata ou Ouro. O Diamante pode ser solicitado sem conta.
          </div>
        )}

        <PlanTierGrid
          plans={plans}
          locale={locale}
          interactive
          loggedIn={Boolean(session?.user)}
        />
      </div>
    </section>
  );
}
