import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { Panel } from "@/components/ui/FinanceUI";
import { SettingsClient } from "@/components/finance/SettingsClient";

export default async function DefinicoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  return (
    <div>
      <h1 className="page-title">Definições</h1>
      <p className="page-sub">Tema, segurança, exportação e preferências.</p>

      <div className="stack-lg">
        <Panel title="Preferências">
          <SettingsClient />
        </Panel>

        <Panel title="Segurança">
          <ul className="muted" style={{ margin: 0, paddingLeft: "1.1rem" }}>
            <li>Login com email e password</li>
            <li>Google OAuth (quando configurado)</li>
            <li>Apple Sign-In (preparado)</li>
            <li>PIN e biometria (flags no perfil — app nativa)</li>
            <li>Encriptação em trânsito (HTTPS) e backups automáticos (infra)</li>
          </ul>
          <p className="small" style={{ marginTop: "0.75rem" }}>
            Conta: <strong>{session.user.email}</strong> · Papel: {membership.role}
          </p>
        </Panel>

        <Panel title="Futuras funcionalidades">
          <ul className="muted" style={{ margin: 0, paddingLeft: "1.1rem" }}>
            <li>Open Banking com bancos portugueses</li>
            <li>Sincronização automática com cartões</li>
            <li>Widgets Android e iPhone</li>
            <li>Notificações push inteligentes</li>
            <li>Leitura automática de emails com faturas</li>
          </ul>
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
