import { getTranslations } from "next-intl/server";

export default async function LocaleLoading() {
  const t = await getTranslations("common");
  return (
    <section className="section">
      <div className="container">
        <p className="page-lead">{t("loading")}</p>
      </div>
    </section>
  );
}
