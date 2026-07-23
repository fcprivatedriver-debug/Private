import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { MemoryRulesClient } from "@/components/nina/MemoryRulesClient";

export default async function MemoriaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const rules = await prisma.ninaMemoryRule.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="page-title">Memória da Nina</h1>
      <p className="page-sub">
        Regras que definiste — a Nina aplica-as automaticamente. Quanto mais usas, menos perguntas.
      </p>
      <Panel title="As tuas regras">
        <MemoryRulesClient rules={rules} />
      </Panel>
      <Panel title="Exemplos">
        <ul className="muted" style={{ margin: 0, paddingLeft: "1.1rem" }}>
          <li>«Sempre que eu disser compras para casa, regista na Conta Familiar.»</li>
          <li>«Sempre que eu disser cliente, considera uma despesa da empresa.»</li>
          <li>«Sempre que eu disser TVDE, coloca na atividade profissional.»</li>
        </ul>
      </Panel>
    </div>
  );
}
