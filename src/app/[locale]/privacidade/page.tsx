import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacidadePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const isPt = locale.startsWith("pt");

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title">{t("privacyTitle")}</h1>
        <p className="page-lead">{t("updated")}</p>
        <div className="prose-block" style={{ marginTop: "0.5rem", lineHeight: 1.7, maxWidth: "40rem" }}>
          {isPt ? (
            <>
              <p>
                Processamos dados de conta (nome, email, telefone), pedidos de viagem, propostas e
                pagamentos para operar o marketplace ZRIK e cumprir obrigações legais.
              </p>
              <p>
                Os contactos entre cliente e motorista só ficam visíveis após a confirmação do
                pagamento — nunca apenas pela aceitação de uma proposta.
              </p>
              <p>
                Os dados são guardados de forma segura e utilizados apenas para prestar o serviço,
                comunicações transacionais e melhoria da plataforma. Pode solicitar acesso ou
                eliminação da sua conta contactando a equipa ZRIK.
              </p>
            </>
          ) : (
            <>
              <p>
                We process account data (name, email, phone), trip requests, offers and payments to
                operate the ZRIK marketplace and meet legal obligations.
              </p>
              <p>
                Customer and driver contact details become visible to the counterpart only after
                payment has been confirmed — never at offer acceptance alone.
              </p>
              <p>
                Data is stored securely and used only to provide the service, send transactional
                messages and improve the platform. You may request access to or deletion of your
                account by contacting the ZRIK team.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
