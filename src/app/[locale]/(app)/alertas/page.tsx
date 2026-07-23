import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { MarkReadButton } from "@/components/finance/MarkReadButton";

export default async function AlertasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const alerts = await prisma.alert.findMany({
    where: { familyId: membership.familyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="page-title">Avisos da Nina</h1>
      <p className="page-sub">
        Eu aviso-te a tempo — sempre com tom positivo e sem julgamentos.
      </p>
      <Panel title="Notificações">
        <div className="list-rows">
          {alerts.map((a) => (
            <div key={a.id} className="list-row">
              <div className="list-row-main">
                <strong>
                  {!a.isRead ? "● " : ""}
                  {a.title}
                </strong>
                <span>
                  {a.message} · {a.createdAt.toLocaleString("pt-PT")}
                </span>
              </div>
              {!a.isRead ? <MarkReadButton id={a.id} /> : <span className="muted small">Lido</span>}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
