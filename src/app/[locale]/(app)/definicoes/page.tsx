import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { Panel } from "@/components/ui/FinanceUI";
import { SettingsClient } from "@/components/finance/SettingsClient";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import Link from "next/link";

const LINKS = [
  { href: "/pt/familia", title: "Família", desc: "Membros, convites e conta familiar" },
  { href: "/pt/orcamentos", title: "Orçamentos", desc: "Limites por categoria" },
  { href: "/pt/objetivos", title: "Objetivos", desc: "Metas de poupança" },
  { href: "/pt/poupancas", title: "Poupança", desc: "Potes e investimentos" },
  { href: "/pt/transacoes", title: "Contas e movimentos", desc: "Receitas e despesas" },
  { href: "/pt/estatisticas", title: "Resumo", desc: "Gráficos e evolução" },
  { href: "/pt/recorrentes", title: "Pagamentos certos", desc: "Renda, luz, subscrições" },
  { href: "/pt/mobilidade", title: "Mobilidade", desc: "Combustível e carregadores" },
  { href: "/pt/calendario", title: "Calendário", desc: "Agenda e lembretes" },
  { href: "/pt/ligacoes", title: "Dados externos", desc: "Bancos, email, supermercados" },
  { href: "/pt/personalizar", title: "Preferências MEL", desc: "Tom de voz e personalidade" },
  { href: "/pt/perfil", title: "Conta", desc: "Perfil, PIN e biometria" },
  { href: "/pt/privacidade-dados", title: "Privacidade", desc: "Os teus dados" },
  { href: "/pt/guia", title: "Guia", desc: "Como usar a addYknow" },
  { href: "/pt/alertas", title: "Avisos", desc: "Alertas e notificações" },
];

export default async function DefinicoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  return (
    <div className="page-stack mais-page">
      <h1 className="page-title">Mais</h1>
      <p className="page-sub">Tudo o que não precisa de estar no ecrã principal.</p>

      <nav className="mais-list" aria-label="Mais opções">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="mais-list-item" prefetch>
            <strong>{l.title}</strong>
            <span className="muted small">{l.desc}</span>
          </Link>
        ))}
      </nav>

      <Panel title="Instalar app">
        <InstallGuide />
      </Panel>

      <Panel title="Preferências">
        <SettingsClient />
      </Panel>

      <section className="mais-account">
        <p className="small">
          {session.user.email} · {membership.role}
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/pt" });
          }}
        >
          <button className="btn btn-danger-outline" type="submit">
            Sair
          </button>
        </form>
      </section>
    </div>
  );
}
