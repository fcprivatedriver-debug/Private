import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { ImportClient } from "@/components/finance/ImportClient";

export default async function ImportacoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const jobs = await prisma.importJob.findMany({
    where: { familyId: membership.familyId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div>
      <h1 className="page-title">Importação automática</h1>
      <p className="page-sub">
        Continente, Pingo Doce, Lidl, Mercadona, Auchan, Repsol, Galp, Prio, Via Verde,
        Tesla, MB Way, Revolut, Open Banking — ou PDF / CSV / Email.
      </p>
      <Panel title="Ligar ou importar">
        <ImportClient />
      </Panel>
      <Panel title="Histórico recente">
        <div className="list-rows">
          {jobs.map((j) => (
            <div key={j.id} className="list-row">
              <div className="list-row-main">
                <strong>{j.sourceLabel || j.provider}</strong>
                <span>{j.createdAt.toLocaleString("pt-PT")}</span>
              </div>
              <span className="muted small">{j.status}</span>
            </div>
          ))}
          {jobs.length === 0 ? <p className="muted">Sem importações ainda.</p> : null}
        </div>
      </Panel>
    </div>
  );
}
