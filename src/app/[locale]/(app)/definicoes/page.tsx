import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { Panel } from "@/components/ui/FinanceUI";
import { SettingsClient } from "@/components/finance/SettingsClient";
import Link from "next/link";

export default async function DefinicoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  return (
    <div>
      <h1 className="page-title">Mais opções</h1>
      <p className="page-sub">
        Tudo o que precisas está aqui — sem complicar. A conversa com a Nina continua a ser o centro.
      </p>

      <div className="stack-lg">
        <Panel title="Atalhos">
          <div className="mais-links">
            <Link href="/pt/captura">
              <strong>Captura Instantânea</strong>
              <span className="muted small">Falar, escrever ou fotografar — em segundos</span>
            </Link>
            <Link href="/pt/lista">
              <strong>Lista de compras</strong>
              <span className="muted small">Partilhada na Conta Familiar</span>
            </Link>
            <Link href="/pt/ligacoes">
              <strong>Ligações da Nina</strong>
              <span className="muted small">Automatização opcional — bancos, email, supermercados…</span>
            </Link>
            <Link href="/pt/familia">
              <strong>Conta Familiar</strong>
              <span className="muted small">Criar, convidar com link/QR, perfis</span>
            </Link>
            <Link href="/pt/memoria">
              <strong>Memória da Nina</strong>
              <span className="muted small">Regras que aprendeste — editáveis</span>
            </Link>
            <Link href="/pt/perfil">
              <strong>O teu perfil</strong>
              <span className="muted small">Nome, PIN, biometria, preferências</span>
            </Link>
            <Link href="/pt/pesquisa">
              <strong>Procurar</strong>
              <span className="muted small">Encontrar um gasto, loja ou categoria</span>
            </Link>
            <Link href="/pt/recorrentes">
              <strong>Pagamentos certos</strong>
              <span className="muted small">Renda, luz, Netflix… a Nina lembra-te</span>
            </Link>
            <Link href="/pt/ocr">
              <strong>Fotografar fatura</strong>
              <span className="muted small">A Nina lê e organiza por ti</span>
            </Link>
            <Link href="/pt/importacoes">
              <strong>Importar automaticamente</strong>
              <span className="muted small">Continente, Galp, MB Way e mais</span>
            </Link>
            <Link href="/pt/ia">
              <strong>Insights da Nina</strong>
              <span className="muted small">Sugestões e relatório do mês</span>
            </Link>
          </div>
        </Panel>

        <Panel title="Preferências">
          <SettingsClient />
        </Panel>

        <Panel title="A tua conta">
          <p className="small">
            {session.user.email} · {membership.role}
          </p>
          <p className="muted small">
            A Nina está do teu lado 24 horas por dia — com confiança, calma e sem julgamentos.
          </p>
        </Panel>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/pt" });
          }}
        >
          <button className="btn btn-danger-outline" type="submit">
            Terminar sessão
          </button>
        </form>
      </div>
    </div>
  );
}
