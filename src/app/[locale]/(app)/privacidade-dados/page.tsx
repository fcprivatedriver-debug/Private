import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { Panel } from "@/components/ui/FinanceUI";
import { PrivacyControls } from "@/components/nina/PrivacyControls";

export default async function PrivacidadeDadosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  return (
    <div className="page-stack">
      <h1 className="page-title">Privacidade e RGPD</h1>
      <p className="page-sub">
        Os teus dados são teus. Exporta, gere permissões ou apaga o que quiseres — com calma e
        clareza.
      </p>
      <Panel title="Os teus direitos">
        <PrivacyControls />
      </Panel>
    </div>
  );
}
