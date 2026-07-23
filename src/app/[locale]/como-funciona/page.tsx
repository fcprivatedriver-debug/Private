import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function ComoFuncionaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("how");
  const th = await getTranslations("home");

  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
          {t("title")}
        </h1>
        <p className="lead">{t("lead")}</p>
        <div className="steps">
          <article>
            <div className="step-num">01</div>
            <h2>{th("step1Title")}</h2>
            <p className="muted">{th("step1Body")}</p>
          </article>
          <article>
            <div className="step-num">02</div>
            <h2>{th("step2Title")}</h2>
            <p className="muted">{th("step2Body")}</p>
          </article>
          <article>
            <div className="step-num">03</div>
            <h2>{th("step3Title")}</h2>
            <p className="muted">{th("step3Body")}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
