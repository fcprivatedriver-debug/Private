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
    cta: "Adicionar Receita",
  },
  {
    title: "Como adicionar uma despesa",
    body: "Fala com a Nina, fotografa uma fatura ou preenche manualmente. Depois podes editar ou eliminar quando quiseres.",
    href: "/pt/despesas/nova",
    cta: "Adicionar Despesa",
  },
  {
    title: "Captura Instantânea",
    body: "O caminho mais simples: voz, texto ou fotografia — sem formulários longos.",
    href: "/pt/captura",
    cta: "Abrir Captura",
  },
  {
    title: "Como criar objetivos",
    body: "Define uma meta (férias, emergência, carro…) e acompanha o progresso com calma.",
    href: "/pt/objetivos",
    cta: "Criar Objetivo",
  },
  {
    title: "Como utilizar a Lista de Compras",
    body: "Cria listas, marca o que já compraste e partilha com a Conta Familiar.",
    href: "/pt/lista",
    cta: "Abrir Lista",
  },
  {
    title: "Como funciona a Conta Familiar",
    body: "Convida quem partilha a casa. Cada pessoa tem perfil próprio; a Nina organiza o que é de todos.",
    href: "/pt/familia",
    cta: "Gerir Família",
  },
  {
    title: "Poupanças",
    body: "Quando houver margem, a Nina sugere reforçar objetivos — tu decides.",
    href: "/pt/poupancas",
    cta: "Ver Poupanças",
  },
  {
    title: "Privacidade e RGPD",
    body: "Exporta os teus dados, gere permissões ou elimina a conta quando quiseres.",
    href: "/pt/privacidade-dados",
    cta: "Abrir Privacidade",
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
        Um manual simples — cada passo leva-te diretamente à funcionalidade.
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
