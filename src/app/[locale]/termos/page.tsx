import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function TermosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const isPt = locale.startsWith("pt");

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title">{t("termsTitle")}</h1>
        <p className="page-lead">{t("updated")}</p>
        <div className="prose-block" style={{ marginTop: "0.5rem", lineHeight: 1.7, maxWidth: "40rem" }}>
          {isPt ? (
            <>
              <p>
                A ZRIK é um marketplace digital que liga clientes a motoristas privados verificados.
                A plataforma não é transportadora: facilita pedidos de viagem, propostas e reservas.
              </p>
              <p>
                Os utilizadores são responsáveis pela exactidão das informações publicadas e pelo
                cumprimento da legislação aplicável ao transporte de passageiros.
              </p>
              <p>
                Após a confirmação do pagamento, a reserva fica garantida e os contactos necessários
                entre as partes são disponibilizados na aplicação. Cancelamentos e reembolsos seguem
                as regras apresentadas no momento da reserva.
              </p>
              <p>
                Ao criar conta e utilizar a ZRIK, aceita estes termos e a nossa política de
                privacidade.
              </p>
            </>
          ) : (
            <>
              <p>
                ZRIK is a digital marketplace connecting customers with verified private drivers. The
                platform is not a carrier: it facilitates trip requests, offers and bookings.
              </p>
              <p>
                Users are responsible for the accuracy of published information and for complying
                with applicable passenger-transport regulations.
              </p>
              <p>
                After payment is confirmed, the booking is secured and the contact details required
                between parties are made available in the app. Cancellations and refunds follow the
                rules shown at booking time.
              </p>
              <p>
                By creating an account and using ZRIK, you accept these terms and our privacy policy.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
