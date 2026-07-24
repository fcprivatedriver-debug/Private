import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomepageLab } from "@/components/brand/HomepageLab";

type Props = { params: Promise<{ locale: string }> };

export default async function HomepageLabPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("homepageLab");
  const home = await getTranslations("home");

  return (
    <section className="section branding-preview fade-up">
      <div className="container" style={{ maxWidth: 1180 }}>
        <HomepageLab
          locale={locale}
          labels={{
            title: t("title"),
            lead: t("lead"),
            note: t("note"),
            versionsTitle: t("versionsTitle"),
            colorTitle: t("colorTitle"),
            overlayTitle: t("overlayTitle"),
            previewTitle: t("previewTitle"),
            selectionTitle: t("selectionTitle"),
            copyLine1: home("copyLine1"),
            copyLine2: home("copyLine2"),
            ctaPrimary: home("ctaRequest"),
            ctaSecondary: home("ctaHow"),
            preferred: t("preferred"),
            notLocked: t("notLocked"),
            textSide: t("textSide"),
            photoSide: t("photoSide"),
          }}
        />
      </div>
    </section>
  );
}
