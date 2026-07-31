import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DiamondProposalForm } from "@/components/plans/DiamondProposalForm";

type Props = { params: Promise<{ locale: string }> };

export default async function DiamantePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p className="hero-eyebrow" style={{ justifyContent: "center" }}>
            💎 Diamante
          </p>
          <h1 className="page-title">Proposta Personalizada</h1>
          <p className="page-lead" style={{ marginInline: "auto" }}>
            Solução totalmente personalizada para quem pretende um serviço exclusivo de motorista
            privado — empresas, hotéis, clínicas, escritórios, famílias e necessidades específicas.
          </p>
        </div>
        <DiamondProposalForm />
        <p className="muted" style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/planos" style={{ textDecoration: "underline" }}>
            ← Voltar aos planos
          </Link>
        </p>
      </div>
    </section>
  );
}
