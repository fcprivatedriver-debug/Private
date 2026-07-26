import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { AiRefreshButton } from "@/components/finance/AiRefreshButton";
import Link from "next/link";

export default async function IaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const insights = await prisma.aiInsight.findMany({
    where: { familyId: membership.familyId, kind: { not: "chat" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="page-title">O que a Nina notou</h1>
      <p className="page-sub">
        Sugestões claras para viveres com mais tranquilidade financeira.{" "}
        <Link href="/pt/dashboard">Voltar a conversar</Link>
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
            <p className="muted">Pede à Nina um resumo ou atualiza a análise.</p>
          ) : null}
        </Panel>
        <Panel title="Atualizar análise">
          <AiRefreshButton />
        </Panel>
      </div>
    </div>
  );
}
