import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { AiRefreshButton } from "@/components/finance/AiRefreshButton";

export default async function IaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const insights = await prisma.aiInsight.findMany({
    where: { familyId: membership.familyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="page-title">Assistente financeiro</h1>
      <p className="page-sub">
        Hábitos, poupança, comparação mensal, anomalias, previsão de saldo e relatórios automáticos.
      </p>
      <div className="two-col">
        <Panel title="Sugestões">
          {insights.map((i) => (
            <div key={i.id} className={`insight ${i.severity}`}>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
            </div>
          ))}
          {insights.length === 0 ? (
            <p className="muted">Clique em atualizar para gerar insights.</p>
          ) : null}
        </Panel>
        <Panel title="Gerar relatório">
          <AiRefreshButton />
        </Panel>
      </div>
    </div>
  );
}
