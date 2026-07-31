import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { Panel } from "@/components/ui/FinanceUI";

const SECTIONS = [
  {
    title: "Como adicionar uma receita",
    body: "Regista salário, subsídio, donativo, reembolso, venda, renda ou outro. O dashboard e os gráficos atualizam sozinhos.",
    href: "/pt/receitas/nova",
    cta: "Experimentar",
  },
  {
    title: "Como adicionar uma despesa",
    body: "Fala com a Nina, fotografa uma fatura ou preenche manualmente. Depois podes editar ou eliminar quando quiseres.",
    href: "/pt/despesas/nova",
    cta: "Experimentar",
  },
  {
    title: "Como editar um movimento",
    body: "Abre Transações, toca no movimento e escolhe Editar. Altera o valor, a data ou a categoria — sem criar duplicados.",
    href: "/pt/transacoes",
    cta: "Abrir",
  },
  {
    title: "Como eliminar um movimento",
    body: "Na ficha do movimento, toca em Eliminar e confirma. Os saldos e gráficos atualizam de imediato.",
    href: "/pt/transacoes",
    cta: "Abrir",
  },
  {
    title: "Como utilizar a captura por voz",
    body: "Toca em Falar e diz naturalmente: «gastei 12 euros no café» ou «recebi o salário». A Nina trata do resto.",
    href: "/pt/captura?mode=voice&auto=1",
    cta: "Experimentar",
  },
  {
    title: "Como fotografar uma fatura",
    body: "Abre a câmara na Captura, fotografa o recibo e confirma os dados. A despesa fica registada com a imagem.",
    href: "/pt/captura?mode=photo&auto=1",
    cta: "Experimentar",
  },
  {
    title: "Como criar objetivos",
    body: "Define uma meta (férias, emergência, carro…) e acompanha o progresso com calma.",
    href: "/pt/objetivos",
    cta: "Abrir",
  },
  {
    title: "Como utilizar as poupanças",
    body: "Vê o que já poupaste, reforça objetivos quando houver margem — tu decides o ritmo.",
    href: "/pt/poupancas",
    cta: "Abrir",
  },
  {
    title: "Como funciona a Conta Familiar",
    body: "Convida quem partilha a casa. Cada pessoa tem perfil próprio; a Nina organiza o que é de todos.",
    href: "/pt/familia",
    cta: "Abrir",
  },
  {
    title: "Como funciona a Lista de Compras",
    body: "Escreve ou diz o produto — a Nina pesquisa no Continente e no Pingo Doce, mostra preços e compara quando fores às compras.",
    href: "/pt/lista",
    cta: "Abrir",
  },
  {
    title: "Como utilizar os gráficos e estatísticas",
    body: "No Resumo vês para onde vai o dinheiro: categorias, evolução e o que mais pesa no mês.",
    href: "/pt/estatisticas",
    cta: "Abrir",
  },
  {
    title: "Mobilidade inteligente",
    body: "Combustível ou elétrico — a Nina recomenda o melhor posto. Diz «onde abasteço?» ou «tenho 30% de bateria».",
    href: "/pt/mobilidade",
    cta: "Abrir",
  },
  {
    title: "Calendário e lembretes",
    body: "A Nina marca no Google, Apple ou Outlook e usa lembretes do sistema — sem calendário privado.",
    href: "/pt/calendario",
    cta: "Abrir",
  },
  {
    title: "Privacidade e RGPD",
    body: "Exporta os teus dados, gere permissões ou elimina a conta quando quiseres.",
    href: "/pt/privacidade-dados",
    cta: "Abrir",
  },
] as const;

export default async function GuiaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  return (
    <div className="page-stack">
      <h1 className="page-title">Guia da Nina</h1>
      <p className="page-sub">
        Aprende a usar a Nina em minutos — cada tópico leva-te direto à funcionalidade.
      </p>

      <div className="guide-grid">
        {SECTIONS.map((s) => (
          <Panel key={s.title} title={s.title}>
            <p className="muted" style={{ marginTop: 0 }}>
              {s.body}
            </p>
            <Link href={s.href} className="btn btn-primary btn-sm">
              {s.cta}
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
